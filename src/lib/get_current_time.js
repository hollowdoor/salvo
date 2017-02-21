import dateFormat from 'dateformat';

export default function getCurrentTime(){
    const m = Date.now();
    const now = new Date(m);
    return {
        safe: dateFormat(now, "dddd_mmmm_dS_yyyy_h.MM.ss_TT"),
        pretty: dateFormat(now, "dddd, mmmm dS, yyyy, h:MM:ss TT"),
        utc: now.toUTCString(),
        milliseconds: m
    };
}
