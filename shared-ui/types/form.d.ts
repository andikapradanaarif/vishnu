export type FormRules =
  | 'required'
  | 'maxLength'
  | 'minLength'
  | 'containsUrl'
  | 'containsHtmlOrScript'
  | 'containsSuspiciousPattern'
  | 'containsDisallowedCharacters'
  | 'invalidEmail';

export type DateTimeRules = 'mustBeInFuture' | 'mustBeInPast';

export type PasswordRules =
  | 'required'
  | 'minLength'
  | 'containLetter'
  | 'containLowercase'
  | 'containUppercase'
  | 'containNumber'
  | 'containSpecialCharacter';

export type TimeTrackingRules =
  | 'required'
  | 'startTimeInvalid'
  | 'startTimeFuture'
  | 'endTimeFuture'
  | 'startAfterEnd'
  | 'durationIsNotPositive'
  | 'durationTooLong'
  | 'endTimeInvalid';

export interface FormRulesOptions {
  maxLength?: number;
  minLength?: number;
  disallowedCharacters?: string[];
}
