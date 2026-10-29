import type { CSSProperties } from "react";
import { HOUR_HEIGHT } from "./type";
import type { CalendarView } from "./type";

interface CalendarSkeletonProps {
	view: CalendarView;
	showWeekend?: boolean;
	loadingText?: string;
}

const Shimmer = ({ className = "", style }: { className?: string; style?: CSSProperties }) => (
	<div className={`animate-pulse bg-neutral-100 rounded ${className}`} style={style} />
);

interface SpinnerProps {
	text?: string;
}

const Spinner = (props: SpinnerProps) => {
	const { text } = props;

	return (
		<div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-10 gap-2">
			<svg
				className="animate-spin text-neutral-300"
				width="24"
				height="24"
				viewBox="0 0 24 24"
				fill="none"
			>
				<circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity="0.3" />
				<path
					d="M12 2a10 10 0 0 1 10 10"
					stroke="currentColor"
					strokeWidth="3"
					strokeLinecap="round"
				/>
			</svg>
			{text && <p className="text-md text-neutral-400">{text}</p>}
		</div>
	);
};

interface DaySkeletonProps {
	loadingText?: string;
}

const DaySkeleton = (props: DaySkeletonProps) => {
	const { loadingText } = props;

	return (
		<div className="flex flex-col h-full relative">
			{/* All-day row */}
			<div className="flex border-b border-neutral-100 bg-neutral-50/50 px-3 py-2 gap-2">
				<Shimmer className="w-10 h-4 shrink-0" />
				<Shimmer className="flex-1 h-4" />
			</div>

			{/* Hour grid */}
			<div className="flex-1 overflow-hidden relative">
				<div className="relative" style={{ height: HOUR_HEIGHT * 8 }}>
					{Array.from({ length: 8 }, (_, i) => (
						<div
							key={i}
							className="absolute left-0 right-0 flex items-start"
							style={{ top: i * HOUR_HEIGHT }}
						>
							<Shimmer className="w-10 h-3 shrink-0 mx-2 mt-1" />
							<div className="flex-1 border-t border-neutral-100" />
						</div>
					))}

					{/* Fake event blocks */}
					<div className="absolute left-14 right-2 top-0">
						<Shimmer className="absolute rounded top-6 h-14 left-0 right-[40%]" />
						<Shimmer className="absolute rounded top-28 h-10 left-[62%] right-0" />
						<Shimmer className="absolute rounded top-48 h-[72px] left-0 right-[20%]" />
						<Shimmer className="absolute rounded top-80 h-10 left-[30%] right-0" />
					</div>
				</div>

				<Spinner text={loadingText} />
			</div>
		</div>
	);
};

interface WeekSkeletonProps {
	showWeekend?: boolean;
	loadingText?: string;
}

const WeekSkeleton = (props: WeekSkeletonProps) => {
	const { showWeekend = true, loadingText } = props;
	const colCount = showWeekend ? 7 : 5;

	return (
		<div className="flex flex-col h-full relative">
			{/* Header row */}
			<div className="flex border-b border-neutral-200 shrink-0">
				<div className="w-12 shrink-0" />
				{Array.from({ length: colCount }, (_, i) => (
					<div
						key={i}
						className="flex-1 flex flex-col items-center gap-1 py-2 border-l border-neutral-200 first:border-l-0"
					>
						<Shimmer className="w-6 h-3" />
						<Shimmer className="w-7 h-7 rounded-full" />
					</div>
				))}
			</div>

			{/* All-day row */}
			<div className="flex border-b border-neutral-100 bg-neutral-50/50 shrink-0">
				<div className="w-12 shrink-0 px-1 py-2">
					<Shimmer className="w-8 h-3 ml-auto" />
				</div>
				{Array.from({ length: colCount }, (_, i) => (
					<div key={i} className="flex-1 p-0.5 border-l border-neutral-200 first:border-l-0">
						{i === 1 && <Shimmer className="h-4" style={{ width: "250%" }} />}
					</div>
				))}
			</div>

			{/* Timed grid */}
			<div className="flex-1 overflow-hidden relative">
				<div className="relative flex" style={{ height: HOUR_HEIGHT * 8 }}>
					{/* Time labels */}
					<div className="w-12 shrink-0 relative">
						{Array.from({ length: 8 }, (_, i) => (
							<div key={i} className="absolute right-2" style={{ top: i * HOUR_HEIGHT - 6 }}>
								{i > 0 && <Shimmer className="w-8 h-3" />}
							</div>
						))}
					</div>

					{/* Day columns */}
					{Array.from({ length: colCount }, (_, ci) => (
						<div key={ci} className="flex-1 relative border-l border-neutral-200 first:border-l-0">
							{Array.from({ length: 8 }, (_, i) => (
								<div
									key={i}
									className="absolute left-0 right-0 border-t border-neutral-200"
									style={{ top: i * HOUR_HEIGHT }}
								/>
							))}
							{/* Fake events — scattered per column */}
							{ci === 0 && <Shimmer className="absolute rounded mx-0.5 top-8 h-11 inset-x-0.5" />}
							{ci === 2 && <Shimmer className="absolute rounded mx-0.5 top-24 h-8 inset-x-0.5" />}
							{ci === 3 && <Shimmer className="absolute rounded mx-0.5 top-40 h-14 inset-x-0.5" />}
							{ci === 5 && <Shimmer className="absolute rounded mx-0.5 top-12 h-10 inset-x-0.5" />}
						</div>
					))}
				</div>

				<Spinner text={loadingText} />
			</div>
		</div>
	);
};

interface MonthSkeletonProps {
	loadingText?: string;
}

const MonthSkeleton = (props: MonthSkeletonProps) => {
	const { loadingText } = props;
	const weeks = 5;
	const cols = 7;

	return (
		<div className="flex flex-col h-full relative">
			{/* Day headers */}
			<div className="grid grid-cols-7 border-b border-neutral-200 shrink-0">
				{Array.from({ length: cols }, (_, i) => (
					<div key={i} className="py-2 flex justify-center">
						<Shimmer className="w-6 h-3" />
					</div>
				))}
			</div>

			{/* Grid */}
			<div className="flex-1 grid relative" style={{ gridTemplateRows: `repeat(${weeks}, 1fr)` }}>
				{Array.from({ length: weeks }, (_, wi) => (
					<div key={wi} className="grid grid-cols-7 border-b border-neutral-200 last:border-b-0">
						{Array.from({ length: cols }, (_, di) => {
							// Deterministic fake event placement
							const hasEvent = (wi * 7 + di) % 3 === 0;
							const hasMultiDay = wi === 1 && di === 2;

							return (
								<div key={di} className="border-r border-neutral-200 last:border-r-0 p-1 min-h-22">
									<div className="flex justify-end mb-1">
										<Shimmer className="w-6 h-6 rounded-full" />
									</div>
									{hasMultiDay && (
										<Shimmer className="h-4 mb-0.5 rounded" style={{ width: "280%" }} />
									)}
									{hasEvent && !hasMultiDay && <Shimmer className="h-3.5 w-3/4 mb-0.5 rounded" />}
									{(wi * 7 + di) % 5 === 0 && <Shimmer className="h-3.5 w-1/2 rounded" />}
								</div>
							);
						})}
					</div>
				))}

				<Spinner text={loadingText} />
			</div>
		</div>
	);
};

interface YearSkeletonProps {
	loadingText?: string;
}

const YearSkeleton = (props: YearSkeletonProps) => {
	const { loadingText } = props;

	return (
		<div className="flex-1 overflow-hidden p-6 relative">
			<div className="grid grid-cols-4 gap-8 max-md:grid-cols-2 max-sm:grid-cols-1">
				{Array.from({ length: 12 }, (_, mi) => (
					<div key={mi} className="flex flex-col">
						{/* Month name */}
						<Shimmer className="w-16 h-4 mb-3" />

						{/* Day header row */}
						<div className="grid grid-cols-7 mb-1 gap-0.5">
							{Array.from({ length: 7 }, (_, i) => (
								<Shimmer key={i} className="h-3 mx-auto w-3" />
							))}
						</div>

						{/* Week rows */}
						{Array.from({ length: 5 }, (_, wi) => (
							<div key={wi} className="grid grid-cols-7 gap-0.5 mb-0.5">
								{Array.from({ length: 7 }, (_, di) => {
									const isEmpty = (mi + wi + di) % 7 === 0;
									return isEmpty ? (
										<div key={di} className="h-6" />
									) : (
										<Shimmer key={di} className="h-6 rounded" />
									);
								})}
							</div>
						))}
					</div>
				))}
			</div>

			<Spinner text={loadingText} />
		</div>
	);
};

export const CalendarSkeleton = (props: CalendarSkeletonProps) => {
	const { view, showWeekend, loadingText } = props;

	switch (view) {
		case "day":
			return <DaySkeleton loadingText={loadingText} />;
		case "week":
			return <WeekSkeleton showWeekend={showWeekend} loadingText={loadingText} />;
		case "month":
			return <MonthSkeleton loadingText={loadingText} />;
		case "year":
			return <YearSkeleton loadingText={loadingText} />;
	}
};
