import {PageTitleProps} from "./type";

export default function PageTitle({title, subtitle}: PageTitleProps) {
	return (
		<div>
			<h1 className="text-2xl lg:text-3xl text-neutral-800 font-semibold">{title}</h1>
			{subtitle && <p className="text-neutral-600 mt-1">{subtitle}</p>}
		</div>
	);
}
