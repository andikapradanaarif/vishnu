export type CalendarView = 'day' | 'week' | 'month' | 'year';

export type CalendarEvent = {
	id: string;
	title: string;
	start: Date;
	end: Date;
	color?: string;
};
