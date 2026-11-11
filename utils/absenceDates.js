function parseFrenchDateTime(value) {
    const match = /^(\d{2})\/(\d{2})\/(\d{4}) (\d{2}):(\d{2})$/.exec(value.trim());
    if (!match) return null;

    const [, dayText, monthText, yearText, hourText, minuteText] = match;
    const expected = {
        day: Number(dayText),
        month: Number(monthText),
        year: Number(yearText),
        hour: Number(hourText),
        minute: Number(minuteText)
    };

    if (expected.hour > 23 || expected.minute > 59) return null;

    const calendarDate = new Date(Date.UTC(expected.year, expected.month - 1, expected.day));
    if (
        calendarDate.getUTCFullYear() !== expected.year ||
        calendarDate.getUTCMonth() !== expected.month - 1 ||
        calendarDate.getUTCDate() !== expected.day
    ) {
        return null;
    }

    const targetAsUTC = Date.UTC(expected.year, expected.month - 1, expected.day, expected.hour, expected.minute);
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
        finalParts.year !== expected.year ||
        finalParts.month !== expected.month ||
        finalParts.day !== expected.day ||
        finalParts.hour !== expected.hour ||
        finalParts.minute !== expected.minute
    ) {
        return null;
    }

    return new Date(timestamp).toISOString();
}

module.exports = { parseFrenchDateTime };
