// naive, but that absolutely does not matter here
function split_syllables(word: string): string[] {
	const regex = /[^aeiouy]*[aeiouy]+(?:[^aeiouy]*$|[^aeiouy](?=[^aeiouy]))?/gi
	const syllables = word.match(regex)
	return syllables || [word]
}

const names = (await Bun.file('corpus.txt').text()).split('\n')

// number is 0-1000 integer weight
type Markov = {
	chain: { [key: string]: [string | null, number][]  }
	chars: string[]
}

function markov_map(corpus: string[], classifier: (str: string) => string[]): Markov {
	// null means the end of the chain
	const chain = new Map<string, Map<string | null, number>>()
	const chars = new Set<string>()

	for (const name of names) {
		if (name === '') {
			console.error('warning: empty name')
			continue
		}

		const parts = classifier(name)

		// iterate characters in name
		for (let i = 0; i < parts.length; i++) {
			const char_1: string = parts[i]
			const char_2: string | null = parts[i + 1] ?? null

			if (char_1.match(/^[A-Z]/)) {
				chars.add(char_1)
			}

			if (chain.has(char_1)) {
				const entry = chain.get(char_1)!

				if (entry.has(char_2)) {
					entry.set(char_2, entry.get(char_2)! + 1)
				} else {
					entry.set(char_2, 1)
				}
			} else {
				chain.set(char_1, new Map([[char_2, 1]]))
			}
		}
	}

	// normalise into 0-1000

	for (const [_, entry] of chain) {
		const total = Array.from(entry.values()).reduce((a, b) => a + b, 0)

		for (const [key, value] of entry) {
			entry.set(key, Math.round((value / total) * 1000))
		}
	}

	const obj: Markov['chain'] = {}

	for (const [key, value] of chain) {
		obj[key] = Array.from(value.entries()).map(([k, v]) => [k, v])
	}

	return {
		chain: obj,
		chars: Array.from(chars),
	}
}

const map = markov_map(names, split_syllables)

function markov({ chain, chars }: Markov) {
	const starting_char = Array.from(chars)[Math.floor(Math.random() * chars.length)]

	function weighted_random_1000<T>(choices: [T, number][]) {
		const random_value = Math.random() * 1000

		let last_good = 0
		let upto = 0
		for (const [char, weight] of choices) {
			upto += weight
			if (upto >= random_value) {
				return char
			}
			last_good++
		}

		return choices[last_good][0]
	}

	// walk the markov chain
	let current_char = starting_char
	let name = starting_char
	while (true) {
		const next_chars = chain[current_char]
		if (!next_chars) {
			break
		}

		const part = weighted_random_1000(next_chars)

		if (part === null) {
			break
		}

		name += part
		current_char = part
	}

	return name
}

for (let i = 0; i < 50; i++) {
	console.log(markov(map))
}

function construct_module(map: Markov) {
	return `const { chain, chars } = JSON.parse('${JSON.stringify(map)}')

export default function markov(): string {
	const starting_char = Array.from(chars)[Math.floor(Math.random() * chars.length)]

	function weighted_random_1000<T>(choices: [T, number][]) {
		const random_value = Math.random() * 1000

		let last_good = 0
		let upto = 0
		for (const [char, weight] of choices) {
			upto += weight
			if (upto >= random_value) {
				return char
			}
			last_good++
		}

		return choices[last_good][0]
	}

	let current_char = starting_char
	let name = starting_char
	while (true) {
		const next_chars = chain[current_char]
		if (!next_chars) {
			break
		}

		const part = weighted_random_1000(next_chars)

		if (part === null) {
			break
		}

		name += part
		current_char = part
	}

	return name
}`
}

//console.log(construct_module(map))
