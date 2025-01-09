export default class Instruction {
    static CursorUp       = 'CUP';
    static CursorDown     = 'CDW';
    static CursorLeft     = 'CLF';
    static CursorRight    = 'CRT';
    static Scroll         = 'SCR';
    static Advance        = 'ADV';
    static Retract        = 'RCT';
    static Character      = 'CHR';
    static ClearCell      = 'CLR';

    static CursorForegroundColor = 'CFC';
    static CursorBackgroundColor = 'CBC';
    static CursorBorderColor     = 'CDC';
    static CursorForegroundPulse = 'CFP';
    static CursorBackgroundPulse = 'CBP';
    static CursorBorderPulse     = 'CDP';

    static GlobalForegroundColor = 'GFC';
    static GlobalBackgroundColor = 'GBC';
    static GlobalBorderColor     = 'GDC';
    static GlobalForegroundPulse = 'GFP';
    static GlobalBackgroundPulse = 'GBP';
    static GlobalBorderPulse     = 'GDP';

    constructor(mnemonic, argument1 = null, argument2 = null) {
        this.mnemonic = mnemonic;
        this.argument1 = argument1;
        this.argument2 = argument2;
    }
}
