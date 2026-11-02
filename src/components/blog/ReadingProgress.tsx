import { useEffect, useState, type RefObject } from "react";

// 顶部阅读进度条。以文章元素自身为基准，而不是整页：正文读完时进度条就到 100%，
// 不会因为下面还有评论和相关文章而永远差一截。
export function ReadingProgress({
	target,
}: {
	target: RefObject<HTMLElement | null>;
}) {
	const [progress, setProgress] = useState(0);

	useEffect(() => {
		let frame = 0;

		const update = () => {
			frame = 0;
			const element = target.current;
			if (!element) return;

			const start = window.scrollY + element.getBoundingClientRect().top;
			const total = element.offsetHeight;
			if (total <= 0) {
				setProgress(0);
				return;
			}

			const read = window.scrollY + window.innerHeight - start;
			setProgress(Math.min(1, Math.max(0, read / total)));
		};

		const onScroll = () => {
			if (frame) return;
			frame = requestAnimationFrame(update);
		};

		update();
		window.addEventListener("scroll", onScroll, { passive: true });
		window.addEventListener("resize", onScroll);
		return () => {
			if (frame) cancelAnimationFrame(frame);
			window.removeEventListener("scroll", onScroll);
			window.removeEventListener("resize", onScroll);
		};
	}, [target]);

	return (
		<div aria-hidden className="fixed inset-x-0 top-0 z-50 h-0.5">
			<div
				className="h-full origin-left bg-brand transition-transform duration-150"
				style={{ transform: `scaleX(${progress})` }}
			/>
		</div>
	);
}
