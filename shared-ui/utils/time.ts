/**
 * Get locale datetime format in string,
 * format would be like this: `MM/DD/YYYY, hh:mm AM/PM`
 * @param date - The date to format
 * @param locale - The locale to use (default: "en-US")
 */
export const getLocaledDateTimeString = (date: Date, locale = "en-US"): string => {
	return new Intl.DateTimeFormat(locale, {
		month: "2-digit",
		day: "2-digit",
		year: "numeric",
		hour: "2-digit",
		minute: "2-digit",
		hour12: true,
	}).format(date);
};
