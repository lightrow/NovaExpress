export function selectRandomWeighted<T>(items: T[], weights: number[]) {
	const totalWeight = weights.reduce((acc, val) => acc + val, 0);
	const random = Math.random() * totalWeight;
	let weightSum = 0;

	for (let i = 0; i < items.length; i++) {
		weightSum += weights[i];
		if (random < weightSum) {
			return items[i];
		}
	}
}
