import gc from "@sg/game-client-base";
import { Label, Node, _decorator } from "cc";
import { AudioUtils } from "db://shared-components/game/audios/utils";
import GameComponent from "db://shared-components/game/scripts/components/game-component";
import { startGame } from "db://shared-components/shared/scripts/startup";
import { AnimationUtils, FunctionUtils } from "db://shared-components/shared/utils";
import Observer from "observer";
import { siteConfigs } from "../../../scripts/site-configs";
import { ColorGame } from "../../color-game/scripts/color-game";
import { ColorDice } from "../../color-game/scripts/dice";
import { settings } from "../game-settings";
import { containerOptions } from "../containerOptions";
import { CameraHandler } from "../handlers/camera-handler";
import { CameraStore } from "../stores/camera-store";
import "./../../../resources/i18n";
import { ColorGameDoubleTripleResult } from "./double-triple-result";
import { ColorGameWinningResult } from "./winning-result";
const { Rounds, Translator } = gc;

startGame(settings.name, containerOptions, siteConfigs);

const { ccclass, property } = _decorator;
const { observer, render, handle } = Observer;

type ResultSoundInfo = {
    soundId: string;
    duration: number;
};

@ccclass
@observer(settings.name)
export default class Game extends GameComponent {
    @property({ type: Label, override: true, visible: false })
    lblMinBet: Label = null;

    @property({ type: Label, override: true, visible: false })
    lblMaxBet: Label = null;

    @property({ type: Node })
    colorGameNode: Node = null;

    @property({ type: Node })
    winningResultNode: Node = null;

    @property({ type: Node })
    doubleTripleResultNode: Node = null;

    @property(Node)
    camera3D: Node = null;

    private winningResult: ColorGameWinningResult = null;
    private colorGame: ColorGame = null;
    private doubleTripleResult: ColorGameDoubleTripleResult = null;

    override namespace = settings.name;
    override containerOptions = containerOptions;
    isLoading = true;

    private readonly winningSounds = {
        [ColorDice.Yellow]: "yellow",
        [ColorDice.Red]: "red",
        [ColorDice.Pink]: "pink",
        [ColorDice.White]: "white",
        [ColorDice.Blue]: "blue",
        [ColorDice.Green]: "green",
    };

    protected clientRoundId = -1;
    protected openAnimationIndex = 0;
    protected randomResults = [1, 1, 1];
    protected hasResetBox = false;
    protected diceDropSound = "dice_drop";
    protected delayDiceDropSound = 0.1;
    protected delayTimeShowWinningBox = 2;
    protected resultsSoundInfo: ResultSoundInfo[] = [];

    onLoad() {
        super.onLoad();
        this.fetchComponents();
        this.winningResult.hideQuickly();
    }

    fetchComponents() {
        this.winningResult = this.winningResultNode.getComponent(ColorGameWinningResult);
        this.colorGame = this.colorGameNode.getComponent(ColorGame);
        this.doubleTripleResult = this.doubleTripleResultNode.getComponent(ColorGameDoubleTripleResult);
    }

    @render(Rounds.RoundStore, (store) => store.clientRoundId)
    storeClientRoundId(clientRoundId: number) {
        this.clientRoundId = clientRoundId;
        this.calculateForDices(clientRoundId);
    }

    @render(Rounds.RoundTimeStore, (store) => store.isInRoundTime)
    renderInRoundTime(isInRoundTime: boolean) {
        if (isInRoundTime && !this.hasResetBox && !this.isLoading) {
            this.resetColorBox();
            this.winningResult.hideQuickly();
        }
    }

    calculateForDices(roundId: number) {
        const seedNumber = 123;
        this.openAnimationIndex = roundId % this.colorGame.openAnimationCount;
        const temp = (roundId * seedNumber).toString().slice(-3);
        this.randomResults = [];
        for (let i = 0; i < 3; i++) {
            this.randomResults.push(+temp[i] % 6);
        }
    }

    async showResult(result: gc.GameServiceMessage.TResult, hasAnimation: boolean) {
        if (result) {
            const results = Object.values(result);
            const animationIndex = this.openAnimationIndex;
            this.activeCameras(true);
            this.disableCamerasWithDelay(hasAnimation ? 2 : 0.1);
            this.hasResetBox = false;
            this.winningResult.setResult(result);
            this.loadSoundResultBeforeRead(result);
            if (hasAnimation) {
                this.colorGame.showResult(results, animationIndex);
                this.handleDiceDropSound();
                await AnimationUtils.delayTime(this.delayTimeShowWinningBox);
                this.winningResult.show();
                this.winningSound();
            } else {
                this.colorGame.showResultStatic(results, animationIndex);
                this.winningResult.showQuickly();
            }
            this.doubleTripleResult.setResult(result);
        }
    }

    async handleDiceDropSound() {
        await AnimationUtils.delayTime(this.delayDiceDropSound);
        this.playSound(this.diceDropSound);
    }

    @handle(CameraHandler, (handler, active: boolean) => handler.activateMainCamera(active))
    activate3DCamera(active: boolean) {
        return active;
    }

    @handle(CameraHandler, (handler, active: boolean) => handler.activateMiniCamera(active))
    activateMiniCamera(active: boolean) {
        return active;
    }

    activeCameras(active: boolean) {
        this.activate3DCamera(active);
        this.activateMiniCamera(active);
    }

    @render(CameraStore, (store) => store.mainCameraActive)
    update3DCameraVisibility(active: boolean) {
        this.camera3D.active = active;
    }

    disableCamerasWithDelay(delay: number) {
        this.unschedule(this.disableCameras);
        this.scheduleOnce(this.disableCameras, delay);
    }

    disableCameras() {
        this.activeCameras(false);
    }

    async winningSound() {
        if (this.resultsSoundInfo.length > 1) {
            await this.playSequentialSounds();
        }
    }

    async playSequentialSounds() {
        for (const resultSoundInfo of this.resultsSoundInfo) {
            this.playSound(resultSoundInfo.soundId);
            await FunctionUtils.delay(resultSoundInfo.duration * 1000);
        }
    }

    async loadSoundResultBeforeRead(data: gc.GameServiceMessage.TResult) {
        let isCancelLoadSounds = false;
        const maxWaitTime = 5000;
        const results = Object.values(data);

        const timeoutCancelWinningSound = setTimeout(() => {
            isCancelLoadSounds = true;
        }, maxWaitTime);

        for (const result of results) {
            if (isCancelLoadSounds) {
                break;
            }
            const winColorName = this.winningSounds[result];
            const soundId = this.getAudioKeyForLanguage(winColorName);
            if (soundId) {
                const duration = await AudioUtils.getDurationClip(soundId);

                if (duration > 0) {
                    this.resultsSoundInfo.push({ soundId, duration });
                }
            }
        }

        timeoutCancelWinningSound && clearTimeout(timeoutCancelWinningSound);
    }

    getAudioKeyForLanguage(name: string): string {
        return `${name}_${Translator.getLanguageId() || "en"}`;
    }

    async handleStartRound(isStartRound: boolean) {
        if (isStartRound) {
            super.handleStartRound(isStartRound);
            this.calculateForDices(this.clientRoundId + 1);
            this.resetColorBox();
            this.winningResult.hide();
            this.resultsSoundInfo = [];
        }
    }

    private resetColorBox() {
        this.activeCameras(true);
        this.colorGame.resetColorBox(this.randomResults);
        this.disableCamerasWithDelay(1);
        this.hasResetBox = true;
    }

    @render(gc.App.AppStore, (store) => store.isLoading)
    updateLoading(isLoading: boolean) {
        this.isLoading = isLoading;
    }
}
