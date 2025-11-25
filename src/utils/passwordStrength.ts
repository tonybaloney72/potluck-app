/**
 * Password strength utility functions
 */

export type PasswordStrength = "weak" | "fair" | "good" | "strong";

interface PasswordStrengthResult {
	strength: PasswordStrength;
	score: number; // 0-4
	feedback: string[];
}

/**
 * Calculates password strength based on common criteria
 */
export const calculatePasswordStrength = (
	password: string,
): PasswordStrengthResult => {
	const feedback: string[] = [];
	let score = 0;

	if (!password) {
		return {
			strength: "weak",
			score: 0,
			feedback: [],
		};
	}

	// Length check
	if (password.length >= 8) {
		score += 1;
	} else {
		feedback.push("Use at least 8 characters");
	}

	if (password.length >= 12) {
		score += 1;
	}

	// Character variety checks
	if (/[a-z]/.test(password)) {
		score += 0.5;
	} else {
		feedback.push("Add lowercase letters");
	}

	if (/[A-Z]/.test(password)) {
		score += 0.5;
	} else {
		feedback.push("Add uppercase letters");
	}

	if (/[0-9]/.test(password)) {
		score += 0.5;
	} else {
		feedback.push("Add numbers");
	}

	if (/[^a-zA-Z0-9]/.test(password)) {
		score += 0.5;
	} else {
		feedback.push("Add special characters");
	}

	// Determine strength level
	let strength: PasswordStrength;
	if (score < 2) {
		strength = "weak";
	} else if (score < 3) {
		strength = "fair";
	} else if (score < 4) {
		strength = "good";
	} else {
		strength = "strong";
	}

	return {
		strength,
		score: Math.min(Math.round(score), 4),
		feedback: feedback.length > 0 ? feedback : [],
	};
};

/**
 * Get color class for password strength indicator
 */
export const getPasswordStrengthColor = (
	strength: PasswordStrength,
): string => {
	switch (strength) {
		case "weak":
			return "bg-red-500";
		case "fair":
			return "bg-orange-500";
		case "good":
			return "bg-yellow-500";
		case "strong":
			return "bg-green-500";
		default:
			return "bg-tertiary";
	}
};

/**
 * Get text color for password strength label
 */
export const getPasswordStrengthTextColor = (
	strength: PasswordStrength,
): string => {
	switch (strength) {
		case "weak":
			return "text-red-500";
		case "fair":
			return "text-orange-500";
		case "good":
			return "text-yellow-500";
		case "strong":
			return "text-green-500";
		default:
			return "text-tertiary";
	}
};
