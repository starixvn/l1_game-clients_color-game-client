import { GameConfigs } from "@sg/game-client-base";
import { LogStore } from "db://shared-components/game/scripts/stores/log-store";
import { settings } from "../../../assets/game/scripts/game-settings";
import { containerOptions } from "db://assets/game/scripts/containerOptions";

jest.mock("db://shared-components/shared/scripts/startup", () => ({
    getSharedContainer: jest.fn(() => ({ sharedContainer: true })),
}));

describe("settings", () => {
    it("should have data as expected", () => {
        // Assert
        expect(settings).toStrictEqual({
            id: 71,
            name: "ColorGame",
            observerNamespace: "ColorGame",
            durations: {
                wholeRound: 41,
                lockingBet: 3,
                placingBet: 30,
                generatingResult: 3,
                startRound: 2,
            },
            numberOfRoundHistory: 100,
        });
    });
});

describe("when container created", () => {
    let container;
    let bind: jest.Mock;
    let toConstantValue: jest.Mock;
    let to: jest.Mock;

    beforeEach(() => {
        toConstantValue = jest.fn();
        to = jest.fn();
        bind = jest.fn().mockImplementation(() => ({ toConstantValue, to }));

        container = { bind };
    });

    it("should bind GameSetting", () => {
        // Act
        containerOptions.onContainerCreated(container);

        // Assert
        expect(bind).toBeCalledWith(GameConfigs.GameSetting);
        expect(toConstantValue).toBeCalledWith(settings);
    });

    it("should bind LogStore", () => {
        // Act
        containerOptions.onContainerCreated(container);

        // Assert
        expect(bind).toBeCalledWith(LogStore);
        expect(to).toBeCalledWith(LogStore);
    });
});
