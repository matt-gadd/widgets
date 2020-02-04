import { DNode } from '@dojo/framework/core/interfaces';
import focus from '@dojo/framework/core/middleware/focus';
import { FocusProperties } from '@dojo/framework/core/mixins/Focus';
import { createICacheMiddleware } from '@dojo/framework/core/middleware/icache';
import theme, { ThemeProperties } from '@dojo/framework/core/middleware/theme';
import validity from '@dojo/framework/core/middleware/validity';
import { create, diffProperty, invalidator, tsx } from '@dojo/framework/core/vdom';
import { formatAriaProperties } from '../common/util';
import HelperText from '../helper-text/index';
import Label from '../label/index';
import * as css from '../theme/default/text-input.m.css';

export type TextInputType =
	| 'text'
	| 'email'
	| 'number'
	| 'password'
	| 'search'
	| 'tel'
	| 'url'
	| 'date';

export interface BaseInputProperties<T extends { value: any } = { value: string }>
	extends ThemeProperties,
		FocusProperties {
	/** Custom aria attributes */
	aria?: { [key: string]: string | null };
	/** Should the field autocomplete */
	autocomplete?: boolean | string;
	/** The disabled property of the input */
	disabled?: boolean;
	/** Text to display below the input */
	helperText?: string;
	/** The label to be displayed above the input */
	label?: string | DNode;
	/** Hides the label for a11y purposes */
	labelHidden?: boolean;
	/** Renderer for leading icon content */
	leading?: () => DNode;
	/** The name property of the input */
	name?: string;
	/** Callback fired when the input is blurred */
	onBlur?(): void;
	/** Callback fired when the input is focused */
	onFocus?(): void;
	/** Callback fired when a key is pressed down */
	onKeyDown?(key: number, preventDefault: () => void): void;
	/** Callback fired when a key is released */
	onKeyUp?(key: number, preventDefault: () => void): void;
	/** Callback fired when the input validation changes */
	onValidate?: (valid: boolean | undefined, message: string) => void;
	/** Callback fired when the input value changes */
	onValue?(value?: T['value']): void;
	/** Callback fired when the input is clicked */
	onClick?(): void;
	/** Callback fired when the pointer enters the input */
	onOver?(): void;
	/** Callback fired when the pointer leaves the input */
	onOut?(): void;
	/** Placeholder text */
	placeholder?: string;
	/** The readonly attribute of the input */
	readOnly?: boolean;
	/** The required attribute of the input */
	required?: boolean;
	/** Renderer for trailing icon content */
	trailing?: () => DNode;

	/** The initial value */
	initialValue?: T['value'];

	/** The id to be applied to the input */
	widgetId?: string;
}

export interface TextInputProperties extends BaseInputProperties {
	/** Custom validator used to validate the contents of the input */
	customValidator?: (value: string) => { valid?: boolean; message?: string } | void;
	/** The min value a number can be */
	min?: number | string;
	/** The max value a number can be */
	max?: number | string;
	/** The step to increment the number value by */
	step?: number | string;
	/** Maximum number of characters allowed in the input */
	maxLength?: number | string;
	/** Minimum number of characters allowed in the input */
	minLength?: number | string;
	/** Pattern used as part of validation */
	pattern?: string | RegExp;
	/** Input type, e.g. text, email, tel, etc. */
	type?: TextInputType;
	/** Represents if the input value is valid */
	valid?: { valid?: boolean; message?: string } | boolean;
}

function formatAutocomplete(autocomplete: string | boolean | undefined): string | undefined {
	if (typeof autocomplete === 'boolean') {
		return autocomplete ? 'on' : 'off';
	}
	return autocomplete;
}

interface TextInputICache {
	uuid: string;
	dirty: boolean;
	value?: string;
	initialValue?: string;
}

const factory = create({
	theme,
	icache: createICacheMiddleware<TextInputICache>(),
	validity,
	focus,
	diffProperty,
	invalidator
}).properties<TextInputProperties>();

export const TextInput = factory(function TextInput({
	middleware: { icache, theme, validity, focus, diffProperty, invalidator },
	properties,
	id
}) {
	diffProperty('pattern', (previous: TextInputProperties, next: TextInputProperties) => {
		const value = next.pattern instanceof RegExp ? next.pattern.source : next.pattern;
		if (value !== previous.pattern) {
			invalidator();
		}
	});
	diffProperty(
		'leading',
		(previous: TextInputProperties, next: TextInputProperties) =>
			previous.leading !== next.leading && invalidator()
	);
	diffProperty(
		'trailing',
		(previous: TextInputProperties, next: TextInputProperties) =>
			previous.leading !== next.leading && invalidator()
	);

	const themeCss = theme.classes(css);
	const dirty = icache.getOrSet('dirty', false);

	const {
		aria = {},
		autocomplete,
		classes,
		customValidator,
		disabled,
		helperText,
		label,
		labelHidden = false,
		leading,
		max,
		maxLength,
		min,
		minLength,
		name,
		onBlur,
		onClick,
		onFocus,
		onKeyDown,
		onKeyUp,
		onOut,
		onOver,
		onValidate,
		onValue,
		pattern: patternValue,
		placeholder,
		readOnly,
		required,
		step,
		theme: themeProp,
		trailing,
		type = 'text',
		initialValue,
		valid: validValue = { valid: undefined, message: '' },
		widgetId = `text-input-${id}`
	} = properties();

	let value = icache.get('value');
	const existingInitialValue = icache.get('initialValue');

	if (initialValue !== existingInitialValue) {
		icache.set('value', initialValue);
		icache.set('initialValue', initialValue);
		value = initialValue;

		onValue && onValue(initialValue);
	}

	const pattern = patternValue instanceof RegExp ? patternValue.source : patternValue;

	function _callOnValidate(valid: boolean | undefined, message: string) {
		let { valid: previousValid } = properties();
		let previousMessage: string | undefined;

		if (typeof previousValid === 'object') {
			previousMessage = previousValid.message;
			previousValid = previousValid.valid;
		}

		if (valid !== previousValid || message !== previousMessage) {
			onValidate && onValidate(valid, message);
		}
	}

	if (onValidate) {
		if (value === '' && !dirty) {
			_callOnValidate(undefined, '');
		} else {
			icache.set('dirty', true);
			let { valid, message = '' } = validity.get('input', value || '');
			if (valid && customValidator) {
				const customValid = customValidator(value || '');
				if (customValid) {
					valid = customValid.valid;
					message = customValid.message || '';
				}
			}

			_callOnValidate(valid, message);
		}
	}

	const { valid, message } =
		typeof validValue === 'boolean' ? { valid: validValue, message: '' } : validValue;

	const computedHelperText = (valid === false && message) || helperText;
	const inputFocused = focus.isFocused('input');

	return (
		<div key="root" classes={themeCss.root} role="presentation">
			<div
				key="wrapper"
				classes={[
					themeCss.wrapper,
					disabled ? themeCss.disabled : null,
					inputFocused ? themeCss.focused : null,
					valid === false ? themeCss.invalid : null,
					valid === true ? themeCss.valid : null,
					readOnly ? themeCss.readonly : null,
					required ? themeCss.required : null,
					leading ? themeCss.hasLeading : null,
					trailing ? themeCss.hasTrailing : null,
					!label ? themeCss.noLabel : null
				]}
				role="presentation"
			>
				{label && (
					<Label
						theme={themeProp}
						disabled={disabled}
						valid={valid}
						focused={inputFocused}
						readOnly={readOnly}
						required={required}
						hidden={labelHidden}
						forId={widgetId}
						active={!!value || inputFocused}
					>
						{label}
					</Label>
				)}
				<div key="inputWrapper" classes={themeCss.inputWrapper} role="presentation">
					{leading && (
						<span key="leading" classes={themeCss.leading}>
							{leading()}
						</span>
					)}
					<input
						{...formatAriaProperties(aria)}
						aria-invalid={valid === false ? 'true' : null}
						autocomplete={formatAutocomplete(autocomplete)}
						classes={themeCss.input}
						disabled={disabled}
						id={widgetId}
						focus={focus.shouldFocus}
						key={'input'}
						max={max}
						maxlength={maxLength ? `${maxLength}` : null}
						min={min}
						minlength={minLength ? `${minLength}` : null}
						name={name}
						pattern={pattern}
						placeholder={placeholder}
						readOnly={readOnly}
						aria-readonly={readOnly ? 'true' : null}
						required={required}
						step={step}
						type={type}
						value={value}
						onblur={() => {
							onBlur && onBlur();
						}}
						onfocus={() => {
							onFocus && onFocus();
						}}
						oninput={(event: Event) => {
							event.stopPropagation();
							const value = (event.target as HTMLInputElement).value;
							icache.set('value', value);
							onValue && onValue(value);
						}}
						onkeydown={(event: KeyboardEvent) => {
							event.stopPropagation();
							onKeyDown && onKeyDown(event.which, () => event.preventDefault());
						}}
						onkeyup={(event: KeyboardEvent) => {
							event.stopPropagation();
							onKeyUp && onKeyUp(event.which, () => event.preventDefault());
						}}
						onclick={() => {
							onClick && onClick();
						}}
						onpointerenter={() => {
							onOver && onOver();
						}}
						onpointerleave={() => {
							onOut && onOut();
						}}
					/>
					{trailing && (
						<span key="trailing" classes={themeCss.trailing}>
							{trailing()}
						</span>
					)}
				</div>
			</div>
			<HelperText
				text={computedHelperText}
				valid={valid}
				classes={classes}
				theme={themeProp}
			/>
		</div>
	);
});

export default TextInput;
