define(["coreFns", "enum", "event", "assertParam"],
function (core, Enum, Event, m_assertParam) {

    /**
    Utility types and functions of generally global applicability.
    @module core
    @main core
    **/
    core.Enum = Enum;
    core.Event = Event;
    core.extend(core, m_assertParam);

    return core;
});
