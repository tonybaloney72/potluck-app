import {
	calculatePasswordStrength,
	getPasswordStrengthColor,
	getPasswordStrengthTextColor,
} from "../../utils/passwordStrength";

interface PasswordStrengthIndicatorProps {
	password: string;
	showFeedback?: boolean;
}

export const PasswordStrengthIndicator = ({
	password,
	showFeedback = true,
}: PasswordStrengthIndicatorProps) => {
	if (!password) return null;

	const { strength, score, feedback } = calculatePasswordStrength(password);

	return (
		<div className='mt-2 space-y-2'>
			{/* Strength Bar */}
			<div className='flex gap-1'>
				{Array.from({ length: 4 }).map((_, i) => (
					<div
						key={i}
						className={`h-1 flex-1 rounded ${
							i < score ? getPasswordStrengthColor(strength) : "bg-tertiary"
						}`}
					/>
				))}
			</div>

			{/* Strength Label and Feedback */}
			{showFeedback && (
				<div>
					<p
						className={`text-xs font-medium ${getPasswordStrengthTextColor(
							strength,
						)}`}>
						Strength: {strength.charAt(0).toUpperCase() + strength.slice(1)}
					</p>
					{feedback.length > 0 && (
						<ul className='mt-1 text-xs text-secondary space-y-0.5'>
							{feedback.map((item, index) => (
								<li key={index}>• {item}</li>
							))}
						</ul>
					)}
				</div>
			)}
		</div>
	);
};
