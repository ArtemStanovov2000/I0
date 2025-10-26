export class Transistor {
    public gate: boolean;
    public isOn: boolean;
    public color: string;

    constructor() {
        this.gate = false; // Только управляющий вход
        this.isOn = false; // Состояние проводимости
        this.color = "#424242ff" // Цвет транзистора
    }

    updateGate(gateVoltage: boolean): void {
        this.gate = gateVoltage;
        this.isOn = this.gate; // Простая логика: высокое напряжение = открыт
        if (gateVoltage) {
            this.color = "#ffe364ff"
        } else {
            this.color = "#424242ff"
        }
    }

    isConducting(): boolean {
        return this.isOn;
    }
}