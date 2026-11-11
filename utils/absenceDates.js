function parseFrenchDate(value, endOfDay = false) {
    const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value.trim());
    if (!match) return null;

    const [, dayText, monthText, yearText] = match;
    const date = {
        day: Number(dayText),
        month: Number(monthText),
        year: Number(yearText)
    };

    const calendarDate = new Date(Date.UTC(date.year, date.month - 1, date.day));
    if (
        calendarDate.getUTCFullYear() !== date.year ||
        calendarDate.getUTCMonth() !== date.month - 1 ||
        calendarDate.getUTCDate() !== date.day
    ) {
        return null;
    }

    if (endOfDay) {
        calendarDate.setUTCDate(calendarDate.getUTCDate() + 1);
        date.year = calendarDate.getUTCFullYear();
        date.month = calendarDate.getUTCMonth() + 1;
        date.day = calendarDate.getUTCDate();
    }

    const targetAsUTC = Date.UTC(date.year, date.month - 1, date.day);
    let timestamp = targetAsUTC;
    const formatter = new Intl.DateTimeFormat('en-GB', {
        timeZone: 'Europe/Paris',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hourCycle: 'h23'
    });

    for (let attempt = 0; attempt < 3; attempt++) {
        const parts = Object.fromEntries(
            formatter.formatToParts(new Date(timestamp))
                .filter(part => part.type !== 'literal')
                .map(part => [part.type, Number(part.value)])
        );
        const displayedAsUTC = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute);
        const difference = targetAsUTC - displayedAsUTC;
        if (difference === 0) break;
        timestamp += difference;
    }

    const finalParts = Object.fromEntries(
        formatter.formatToParts(new Date(timestamp))
            .filter(part => part.type !== 'literal')
            .map(part => [part.type, Number(part.value)])
    );
    if (
        finalParts.year !== date.year ||
        finalParts.month !== date.month ||
        finalParts.day !== date.day ||
        finalParts.hour !== 0 ||
        finalParts.minute !== 0
    ) {
        return null;
    }

    return new Date(timestamp).toISOString();
}

module.exports = { parseFrenchDate };
