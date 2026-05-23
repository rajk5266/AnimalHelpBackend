import dayjs from "dayjs";
import timezone from "dayjs/plugin/timezone.js";
import utc from "dayjs/plugin/utc.js";
dayjs.extend(utc);
dayjs.extend(timezone);

function getDateTimeInUTC(
    date: string,
    time: string,
    timeZone = "Asia/Kolkata"
) {
    const dateTime = dayjs
        .tz(date.split("T")[0] + "T" + time, timeZone)
        .utc()
        .toISOString();
    return dateTime;
}

export default getDateTimeInUTC;
