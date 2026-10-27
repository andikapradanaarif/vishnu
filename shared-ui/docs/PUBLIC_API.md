# Public API Reference

Canonical human-readable API reference for `@vishnu/ui-component`.

This file is a companion to `docs/PUBLIC_API.json` and should stay aligned with:

- `index.ts`
- `package.json#exports`

## Package

- **Name**: `@vishnu/ui-component`
- **Version**: `1.0.0`
- **Last audited**: `2026-10-17`

## Supported Entry Points

The following entrypoints are supported:

1. `@vishnu/ui-component` — root barrel (curated: components, their prop types, and common hooks; the full helper surface is in the `utils` and `hooks` subpaths)
2. `@vishnu/ui-component/styles.css` — global stylesheet
3. Per-component subpaths (for tree-shaking):
   - `@vishnu/ui-component/accordion`
   - `@vishnu/ui-component/actionBar`
   - `@vishnu/ui-component/alert`
   - `@vishnu/ui-component/breadcrumb`
   - `@vishnu/ui-component/browserWarning`
   - `@vishnu/ui-component/button`
   - `@vishnu/ui-component/calendar`
   - `@vishnu/ui-component/chip`
   - `@vishnu/ui-component/clickOutside`
   - `@vishnu/ui-component/dataList`
   - `@vishnu/ui-component/dialog`
   - `@vishnu/ui-component/drawer`
   - `@vishnu/ui-component/emptyData`
   - `@vishnu/ui-component/emptyState`
   - `@vishnu/ui-component/form`
   - `@vishnu/ui-component/hooks`
   - `@vishnu/ui-component/input`
   - `@vishnu/ui-component/loadingAnimation`
   - `@vishnu/ui-component/menu`
   - `@vishnu/ui-component/message`
   - `@vishnu/ui-component/pagination`
   - `@vishnu/ui-component/popover`
   - `@vishnu/ui-component/progressBar`
   - `@vishnu/ui-component/qrCode`
   - `@vishnu/ui-component/rating`
   - `@vishnu/ui-component/richTextEditor`
   - `@vishnu/ui-component/slider`
   - `@vishnu/ui-component/stepper`
   - `@vishnu/ui-component/table`
   - `@vishnu/ui-component/tabs`
   - `@vishnu/ui-component/text`
   - `@vishnu/ui-component/timePicker`
   - `@vishnu/ui-component/tooltip`
   - `@vishnu/ui-component/userImageIcon`
   - `@vishnu/ui-component/utils`
   - `@vishnu/ui-component/wrapper`

## Import Policy

- Import components and their prop types from `@vishnu/ui-component`; utility helpers are exported from `@vishnu/ui-component/utils` and the extended hook surface from `@vishnu/ui-component/hooks` (the root barrel is a curated subset).
- Import stylesheet from `@vishnu/ui-component/styles.css`.
- For maximum tree-shaking, import from per-component subpaths:

```ts
// Root barrel (curated: components and their prop types)
import {Button, Input, Tabs} from "@vishnu/ui-component";
import type {TabsProps} from "@vishnu/ui-component";

// Per-component subpath (tree-shaken)
import {Button} from "@vishnu/ui-component/button";
import {Input, Select} from "@vishnu/ui-component/input";
```

The stylesheet is loaded through the consumer's Tailwind-processed CSS
entry (`@import "tailwindcss"; @import "@vishnu/ui-component/styles.css";
@source ...` — see `docs/user-guide/styling.md`), not a JS import. It
declares its `--color-*` tokens with Tailwind's `@theme` directive, so
**Tailwind CSS v4.3.3 or newer is required** (`tailwindcss` is a peer
dependency); the library provides no v3 fallback.

## Public Exports

### Components / Values (140)

| Export                  | Kind      | Canonical Import                                            | Source Specifier                                 | Source Export                  |
| ----------------------- | --------- | ----------------------------------------------------------- | ------------------------------------------------ | ------------------------------ |
| `ActionBar`             | component | `import {ActionBar} from "@vishnu/ui-component"`             | `./ui-component/actionBar/ActionBar`             | named                          |
| `Breadcrumb`            | component | `import {Breadcrumb} from "@vishnu/ui-component"`            | `./ui-component/breadcrumb/Breadcrumb`           | named                          |
| `Button`                | component | `import {Button} from "@vishnu/ui-component"`                | `./ui-component/button/Button`                   | named                          |
| `ButtonGroup`           | component | `import {ButtonGroup} from "@vishnu/ui-component"`           | `./ui-component/button/ButtonGroup`              | named                          |
| `BrowserNotSupportedDialog` | component | `import {BrowserNotSupportedDialog} from "@vishnu/ui-component"` | `./ui-component/browserWarning/BrowserNotSupportedDialog` | named                |
| `Calendar`              | component | `import {Calendar} from "@vishnu/ui-component"`              | `./ui-component/calendar/Calendar`               | named                          |
| `Chip`                  | component | `import {Chip} from "@vishnu/ui-component"`                  | `./ui-component/chip/Chip`                       | named                          |
| `DataList`              | component | `import {DataList} from "@vishnu/ui-component"`              | `./ui-component/dataList/DataList`               | named                          |
| `Dialog`                | component | `import {Dialog} from "@vishnu/ui-component"`                | `./ui-component/dialog/Dialog`                   | named                          |
| `Drawer`                | component | `import {Drawer} from "@vishnu/ui-component"`                | `./ui-component/drawer/Drawer`                   | named                          |
| `Input`                 | component | `import {Input} from "@vishnu/ui-component"`                 | `./ui-component/input/Input`                     | default (re-exported as named) |
| `PasswordInput`         | component | `import {PasswordInput} from "@vishnu/ui-component"`         | `./ui-component/input/PasswordInput`             | default (re-exported as named) |
| `Message`               | component | `import {Message} from "@vishnu/ui-component"`               | `./ui-component/message/Message`                 | default (re-exported as named) |
| `Pagination`            | component | `import {Pagination} from "@vishnu/ui-component"`            | `./ui-component/pagination/Pagination`           | named                          |
| `Popover`               | component | `import {Popover} from "@vishnu/ui-component"`               | `./ui-component/popover/Popover`                 | named                          |
| `RichDescription`       | component | `import {RichDescription} from "@vishnu/ui-component"`       | `./ui-component/richDescription/RichDescription` | named                          |
| `Table`                 | component | `import {Table} from "@vishnu/ui-component"`                 | `./ui-component/table/Table`                     | named                          |
| `Tooltip`               | component | `import {Tooltip} from "@vishnu/ui-component"`               | `./ui-component/tooltip/Tooltip`                 | named                          |
| `Select`                | component | `import {Select} from "@vishnu/ui-component"`                | `./ui-component/input/Select`                    | default (re-exported as named) |
| `TextAreaInput`         | component | `import {TextAreaInput} from "@vishnu/ui-component"`         | `./ui-component/input/TextAreaInput`             | default (re-exported as named) |
| `Tabs`                  | component | `import {Tabs} from "@vishnu/ui-component"`                  | `./ui-component/tabs/Tabs`                       | default (re-exported as named) |
| `Checkbox`              | component | `import {Checkbox} from "@vishnu/ui-component"`              | `./ui-component/input/Checkbox`                  | named                          |
| `Switch`                | component | `import {Switch} from "@vishnu/ui-component"`                | `./ui-component/input/Switch`                    | named                          |
| `Radio`                 | component | `import {Radio} from "@vishnu/ui-component"`                 | `./ui-component/input/Radio`                     | named                          |
| `DatePicker`            | component | `import {DatePicker} from "@vishnu/ui-component"`            | `./ui-component/input/DatePicker`                | named                          |
| `DateRangePicker`       | component | `import {DateRangePicker} from "@vishnu/ui-component"`       | `./ui-component/input/DateRangePicker`           | named                          |
| `MultipleSelect`        | component | `import {MultipleSelect} from "@vishnu/ui-component"`        | `./ui-component/input/MultipleSelect`            | default (re-exported as named) |
| `SearchInput`           | component | `import {SearchInput} from "@vishnu/ui-component"`           | `./ui-component/input/SearchInput`               | default (re-exported as named) |
| `SegmentedControl`      | component | `import {SegmentedControl} from "@vishnu/ui-component"`      | `./ui-component/input/SegmentedControl`          | named                          |
| `LoadingAnimation`      | component | `import {LoadingAnimation} from "@vishnu/ui-component"`      | `./ui-component/loadingAnimation/LoadingDots`    | named                          |
| `LoadingSpinner`        | component | `import {LoadingSpinner} from "@vishnu/ui-component"`        | `./ui-component/loadingAnimation/LoadingSpinner` | default (re-exported as named) |
| `FormValidator`         | component | `import {FormValidator} from "@vishnu/ui-component"`         | `./ui-component/form/FormValidator`              | default (re-exported as named) |
| `PasswordFormValidator` | component | `import {PasswordFormValidator} from "@vishnu/ui-component"` | `./ui-component/form/PasswordFormValidator`      | default (re-exported as named) |
| `DateTimeValidator`     | component | `import {DateTimeValidator} from "@vishnu/ui-component"`     | `./ui-component/form/DateTimeValidator`          | named                          |
| `TimeTrackingValidator` | component | `import {TimeTrackingValidator} from "@vishnu/ui-component"` | `./ui-component/form/TimeTrackingValidator`      | default (re-exported as named) |
| `Title`                 | component | `import {Title} from "@vishnu/ui-component"`                 | `./ui-component/text/Title`                      | default (re-exported as named) |
| `Subtitle`              | component | `import {Subtitle} from "@vishnu/ui-component"`              | `./ui-component/text/Subtitle`                   | default (re-exported as named) |
| `Caption`               | component | `import {Caption} from "@vishnu/ui-component"`               | `./ui-component/text/Caption`                    | default (re-exported as named) |
| `Paragraph`             | component | `import {Paragraph} from "@vishnu/ui-component"`             | `./ui-component/text/Paragraph`                  | default (re-exported as named) |
| `Rating` | component | `import {Rating} from "@vishnu/ui-component"` | `./ui-component/rating/Rating` | named |
| `ProgressBar` | component | `import {ProgressBar} from "@vishnu/ui-component"` | `./ui-component/progressBar/ProgressBar` | named |
| `CircularProgress` | component | `import {CircularProgress} from "@vishnu/ui-component"` | `./ui-component/progressBar/CircularProgress` | named |
| `PageTitle` | component | `import {PageTitle} from "@vishnu/ui-component"` | `./ui-component/text/PageTitle` | default (re-exported as named) |
| `Alert` | component | `import {Alert} from "@vishnu/ui-component"` | `./ui-component/alert/Alert` | default (re-exported as named) |
| `AlertInline` | component | `import {AlertInline} from "@vishnu/ui-component"` | `./ui-component/alert/AlertInline` | default (re-exported as named) |
| `AlertToast` | component | `import {AlertToast} from "@vishnu/ui-component"` | `./ui-component/alert/AlertToast` | default (re-exported as named) |
| `ClickOutside` | component | `import {ClickOutside} from "@vishnu/ui-component"` | `./ui-component/clickOutside/ClickOutSide` | named |
| `Skeleton` | component | `import {Skeleton} from "@vishnu/ui-component"` | `./ui-component/loadingAnimation/Skeleton` | default (re-exported as named) |
| `MenuItem` | component | `import {MenuItem} from "@vishnu/ui-component"` | `./ui-component/menu/MenuItem` | default (re-exported as named) |
| `MenuLink` | component | `import {MenuLink} from "@vishnu/ui-component"` | `./ui-component/menu/MenuLink` | named |
| `UserImageIcon` | component | `import {UserImageIcon} from "@vishnu/ui-component"` | `./ui-component/userImageIcon/UserImageIcon` | default (re-exported as named) |
| `UserAvatarFallback` | component | `import {UserAvatarFallback} from "@vishnu/ui-component"` | `./ui-component/userImageIcon/UserAvatarFallback` | named |
| `Accordion` | component | `import {Accordion} from "@vishnu/ui-component"` | `./ui-component/accordion/Accordion` | named |
| `EmptyData` | component | `import {EmptyData} from "@vishnu/ui-component"` | `./ui-component/emptyData/EmptyData` | named |
| `QrCode` | component | `import {QrCode} from "@vishnu/ui-component"` | `./ui-component/qrCode/QrCode` | named |
| `Stepper` | component | `import {Stepper} from "@vishnu/ui-component"` | `./ui-component/stepper/Stepper` | named |
| `Slider` | component | `import {Slider} from "@vishnu/ui-component"` | `./ui-component/slider/Slider` | named |
| `RichTextEditor` | component | `import {RichTextEditor} from "@vishnu/ui-component"` | `./ui-component/richTextEditor/RichTextEditor` | default (re-exported as named) |
| `ContentWrapper` | component | `import {ContentWrapper} from "@vishnu/ui-component"` | `./ui-component/wrapper/ContentWrapper` | default (re-exported as named) |
| `PageWrapper` | component | `import {PageWrapper} from "@vishnu/ui-component"` | `./ui-component/wrapper/PageWrapper` | default (re-exported as named) |
| `FormList` | component | `import {FormList} from "@vishnu/ui-component"` | `./ui-component/form/FormList` | named |
| `TimePicker` | component | `import {TimePicker} from "@vishnu/ui-component"` | `./ui-component/input/timePicker/TimePicker` | default (re-exported as named) |
| `delay` | value | `import {delay} from "@vishnu/ui-component"` | `./utils/async` | named |
| `getStringHash` | value | `import {getStringHash} from "@vishnu/ui-component"` | `./utils/string` | named |
| `decodeHtml` | value | `import {decodeHtml} from "@vishnu/ui-component"` | `./utils/string` | named |
| `getFullName` | value | `import {getFullName} from "@vishnu/ui-component"` | `./utils/string` | named |
| `pasteFromClipboard` | value | `import {pasteFromClipboard} from "@vishnu/ui-component"` | `./utils/string` | named |
| `getLocaledDateTimeString` | value | `import {getLocaledDateTimeString} from "@vishnu/ui-component"` | `./utils/time` | named |
| `stringComparisonFn` | value | `import {stringComparisonFn} from "@vishnu/ui-component"` | `./utils/sorting` | named |
| `numberComparisonFn` | value | `import {numberComparisonFn} from "@vishnu/ui-component"` | `./utils/sorting` | named |
| `dateComparisonFn` | value | `import {dateComparisonFn} from "@vishnu/ui-component"` | `./utils/sorting` | named |
| `downloadUrlViaDOM` | value | `import {downloadUrlViaDOM} from "@vishnu/ui-component"` | `./utils/download` | named |
| `dataSourceFormatter` | value | `import {dataSourceFormatter} from "@vishnu/ui-component"` | `./utils/table` | named |
| `EMPTY_RICH_TEXT_VALUE` | value | `import {EMPTY_RICH_TEXT_VALUE} from "@vishnu/ui-component"` | `./utils/richText` | named |
| `createEmptyRichTextValue` | value | `import {createEmptyRichTextValue} from "@vishnu/ui-component"` | `./utils/richText` | named |
| `serializeRichText` | value | `import {serializeRichText} from "@vishnu/ui-component"` | `./utils/richText` | named |
| `deserializeRichText` | value | `import {deserializeRichText} from "@vishnu/ui-component"` | `./utils/richText` | named |
| `isRichTextEmpty` | value | `import {isRichTextEmpty} from "@vishnu/ui-component"` | `./utils/richText` | named |
| `serializeRichTextToHtml` | value | `import {serializeRichTextToHtml} from "@vishnu/ui-component"` | `./utils/richText` | named |
| `useDebounce` | hook | `import {useDebounce} from "@vishnu/ui-component"` | `./hooks/useDebounce` | named |
| `useDebounceFunc` | hook | `import {useDebounceFunc} from "@vishnu/ui-component"` | `./hooks/useDebounce` | named |
| `useTimer` | hook | `import {useTimer} from "@vishnu/ui-component"` | `./hooks/useTimer` | named |
| `useBrowserSupport` | hook | `import {useBrowserSupport} from "@vishnu/ui-component"` | `./hooks/useBrowserSupport` | named |
| `useRichTextField` | hook | `import {useRichTextField} from "@vishnu/ui-component"` | `./hooks/useRichTextField` | named |
| `filterTree` | value | `import {filterTree} from "@vishnu/ui-component/utils"` | `./utils/array` | named |
| `flatten` | value | `import {flatten} from "@vishnu/ui-component/utils"` | `./utils/array` | named |
| `isSameTime` | value | `import {isSameTime} from "@vishnu/ui-component/utils"` | `./utils/date` | named |
| `intlFormatDate` | value | `import {intlFormatDate} from "@vishnu/ui-component/utils"` | `./utils/date` | named |
| `intlFormatDateWithTime` | value | `import {intlFormatDateWithTime} from "@vishnu/ui-component/utils"` | `./utils/date` | named |
| `shortWeekNames` | value | `import {shortWeekNames} from "@vishnu/ui-component/utils"` | `./utils/date` | named |
| `monthsNames` | value | `import {monthsNames} from "@vishnu/ui-component/utils"` | `./utils/date` | named |
| `getYearsUntilNow` | value | `import {getYearsUntilNow} from "@vishnu/ui-component/utils"` | `./utils/date` | named |
| `listYears` | value | `import {listYears} from "@vishnu/ui-component/utils"` | `./utils/date` | named |
| `getStartOfDay` | value | `import {getStartOfDay} from "@vishnu/ui-component/utils"` | `./utils/date` | named |
| `getEndOfDay` | value | `import {getEndOfDay} from "@vishnu/ui-component/utils"` | `./utils/date` | named |
| `getStartOfMonth` | value | `import {getStartOfMonth} from "@vishnu/ui-component/utils"` | `./utils/date` | named |
| `getEndOfMonth` | value | `import {getEndOfMonth} from "@vishnu/ui-component/utils"` | `./utils/date` | named |
| `getStartOfWeek` | value | `import {getStartOfWeek} from "@vishnu/ui-component/utils"` | `./utils/date` | named |
| `getEndOfWeek` | value | `import {getEndOfWeek} from "@vishnu/ui-component/utils"` | `./utils/date` | named |
| `getStartOfYear` | value | `import {getStartOfYear} from "@vishnu/ui-component/utils"` | `./utils/date` | named |
| `getEndOfYear` | value | `import {getEndOfYear} from "@vishnu/ui-component/utils"` | `./utils/date` | named |
| `getDateBeforeMonths` | value | `import {getDateBeforeMonths} from "@vishnu/ui-component/utils"` | `./utils/date` | named |
| `addDays` | value | `import {addDays} from "@vishnu/ui-component/utils"` | `./utils/date` | named |
| `subDays` | value | `import {subDays} from "@vishnu/ui-component/utils"` | `./utils/date` | named |
| `addWeeks` | value | `import {addWeeks} from "@vishnu/ui-component/utils"` | `./utils/date` | named |
| `addMonths` | value | `import {addMonths} from "@vishnu/ui-component/utils"` | `./utils/date` | named |
| `addYears` | value | `import {addYears} from "@vishnu/ui-component/utils"` | `./utils/date` | named |
| `getFormattedTimeString` | value | `import {getFormattedTimeString} from "@vishnu/ui-component/utils"` | `./utils/date` | named |
| `getFormattedDateString` | value | `import {getFormattedDateString} from "@vishnu/ui-component/utils"` | `./utils/date` | named |
| `getDurationBetweenDates` | value | `import {getDurationBetweenDates} from "@vishnu/ui-component/utils"` | `./utils/date` | named |
| `mergeDateAndTime` | value | `import {mergeDateAndTime} from "@vishnu/ui-component/utils"` | `./utils/date` | named |
| `formatDateToLocalizedString` | value | `import {formatDateToLocalizedString} from "@vishnu/ui-component/utils"` | `./utils/date` | named |
| `pad` | value | `import {pad} from "@vishnu/ui-component/utils"` | `./utils/date` | named |
| `formatDuration` | value | `import {formatDuration} from "@vishnu/ui-component/utils"` | `./utils/date` | named |
| `getDayDescription` | value | `import {getDayDescription} from "@vishnu/ui-component/utils"` | `./utils/date` | named |
| `getDurationMs` | value | `import {getDurationMs} from "@vishnu/ui-component/utils"` | `./utils/date` | named |
| `formatTime` | value | `import {formatTime} from "@vishnu/ui-component/utils"` | `./utils/date` | named |
| `formatDate` | value | `import {formatDate} from "@vishnu/ui-component/utils"` | `./utils/date` | named |
| `formatMonthYear` | value | `import {formatMonthYear} from "@vishnu/ui-component/utils"` | `./utils/date` | named |
| `formatYear` | value | `import {formatYear} from "@vishnu/ui-component/utils"` | `./utils/date` | named |
| `formatDateRange` | value | `import {formatDateRange} from "@vishnu/ui-component/utils"` | `./utils/date` | named |
| `roundUpToNearestByMinutes` | value | `import {roundUpToNearestByMinutes} from "@vishnu/ui-component/utils"` | `./utils/date` | named |
| `roundToNearestByMinutes` | value | `import {roundToNearestByMinutes} from "@vishnu/ui-component/utils"` | `./utils/date` | named |
| `addHours` | value | `import {addHours} from "@vishnu/ui-component/utils"` | `./utils/date` | named |
| `formatRelativeDate` | value | `import {formatRelativeDate} from "@vishnu/ui-component/utils"` | `./utils/date` | named |
| `validator` | value | `import {validator} from "@vishnu/ui-component/utils"` | `./utils/form` | named |
| `passwordValidator` | value | `import {passwordValidator} from "@vishnu/ui-component/utils"` | `./utils/form` | named |
| `startTimeValidator` | value | `import {startTimeValidator} from "@vishnu/ui-component/utils"` | `./utils/form` | named |
| `endTimeValidator` | value | `import {endTimeValidator} from "@vishnu/ui-component/utils"` | `./utils/form` | named |
| `createRipple` | value | `import {createRipple} from "@vishnu/ui-component/utils"` | `./utils/ripple` | named |
| `getLanguage` | value | `import {getLanguage} from "@vishnu/ui-component/utils"` | `./utils/storage` | named |
| `setLanguage` | value | `import {setLanguage} from "@vishnu/ui-component/utils"` | `./utils/storage` | named |
| `translate` | value | `import {translate} from "@vishnu/ui-component/utils"` | `./utils/translation` | named |
| `TranslationProvider` | value | `import {TranslationProvider} from "@vishnu/ui-component/hooks"` | `./hooks/TranslationProvider` | named |
| `DEFAULT_MIN_VERSIONS` | value | `import {DEFAULT_MIN_VERSIONS} from "@vishnu/ui-component/hooks"` | `./hooks/useBrowserSupport` | named |
| `detectBrowser` | value | `import {detectBrowser} from "@vishnu/ui-component/hooks"` | `./hooks/useBrowserSupport` | named |
| `useIsSmallerThanTablet` | hook | `import {useIsSmallerThanTablet} from "@vishnu/ui-component/hooks"` | `./hooks/useScreenSize` | named |
| `useIsSmallPhone` | hook | `import {useIsSmallPhone} from "@vishnu/ui-component/hooks"` | `./hooks/useScreenSize` | named |
| `useSlicedPages` | hook | `import {useSlicedPages} from "@vishnu/ui-component/hooks"` | `./hooks/useSlicedPages` | named |
| `EmptyState` | component | `import {EmptyState} from "@vishnu/ui-component"` | `./ui-component/emptyData/EmptyData` | named |

### Types (77)

| Export                    | Kind | Canonical Import                                                   | Source Specifier                                  |
| ------------------------- | ---- | ------------------------------------------------------------------ | ------------------------------------------------- |
| `SelectOption`            | type | `import type {SelectOption} from "@vishnu/ui-component"`            | `./ui-component/input/types`                      |
| `BreadcrumbItem`          | type | `import type {BreadcrumbItem} from "@vishnu/ui-component"`          | `./ui-component/breadcrumb/type`                  |
| `BreadcrumbProps`         | type | `import type {BreadcrumbProps} from "@vishnu/ui-component"`         | `./ui-component/breadcrumb/type`                  |
| `UserAvatarFallbackProps` | type | `import type {UserAvatarFallbackProps} from "@vishnu/ui-component"` | `./ui-component/userImageIcon/UserAvatarFallback` |
| `UserImageIconSize`       | type | `import type {UserImageIconSize} from "@vishnu/ui-component"`       | `./ui-component/userImageIcon/UserAvatarFallback` |
| `DataListDirection`       | type | `import type {DataListDirection} from "@vishnu/ui-component"`       | `./ui-component/dataList/type`                    |
| `DataListItemProps`       | type | `import type {DataListItemProps} from "@vishnu/ui-component"`       | `./ui-component/dataList/type`                    |
| `DataListLabelProps`      | type | `import type {DataListLabelProps} from "@vishnu/ui-component"`      | `./ui-component/dataList/type`                    |
| `DateTimeRules`           | type | `import type {DateTimeRules} from "@vishnu/ui-component"`           | `./types/form`                                    |
| `TimeTrackingRules`       | type | `import type {TimeTrackingRules} from "@vishnu/ui-component"`       | `./types/form`                                    |
| `BrowserNotSupportedDialogProps` | type | `import type {BrowserNotSupportedDialogProps} from "@vishnu/ui-component"` | `./ui-component/browserWarning/type`       |
| `MenuLinkProps`           | type | `import type {MenuLinkProps} from "@vishnu/ui-component"`           | `./ui-component/menu/MenuLink`                    |
| `SelectProps`             | type | `import type {SelectProps} from "@vishnu/ui-component"`             | `./ui-component/input/types`                      |
| `InputProps`              | type | `import type {InputProps} from "@vishnu/ui-component"`              | `./ui-component/input/types`                      |
| `TextAreaInputProps`      | type | `import type {TextAreaInputProps} from "@vishnu/ui-component"`      | `./ui-component/input/types`                      |
| `RadioOption`             | type | `import type {RadioOption} from "@vishnu/ui-component"`             | `./ui-component/input/types`                      |
| `RadioProps`              | type | `import type {RadioProps} from "@vishnu/ui-component"`              | `./ui-component/input/types`                      |
| `SwitchProps`             | type | `import type {SwitchProps} from "@vishnu/ui-component"`             | `./ui-component/input/types`                      |
| `MultipleSelectProps`     | type | `import type {MultipleSelectProps} from "@vishnu/ui-component"`     | `./ui-component/input/types`                      |
| `DatePickerProps`         | type | `import type {DatePickerProps} from "@vishnu/ui-component"`         | `./ui-component/input/types`                      |
| `DateRangePickerProps`    | type | `import type {DateRangePickerProps} from "@vishnu/ui-component"`    | `./ui-component/input/types`                      |
| `DateRangeType`           | type | `import type {DateRangeType} from "@vishnu/ui-component"`           | `./ui-component/input/types`                      |
| `SegmentedControlOption`  | type | `import type {SegmentedControlOption} from "@vishnu/ui-component"`  | `./ui-component/input/types`                      |
| `SegmentedControlProps`   | type | `import type {SegmentedControlProps} from "@vishnu/ui-component"`   | `./ui-component/input/types`                      |
| `SegmentedControlSize`    | type | `import type {SegmentedControlSize} from "@vishnu/ui-component"`    | `./ui-component/input/types`                      |
| `TimePickerProps`         | type | `import type {TimePickerProps} from "@vishnu/ui-component"`         | `./ui-component/input/types`                      |
| `Tab`                     | type | `import type {Tab} from "@vishnu/ui-component"`                     | `./ui-component/tabs/type`                        |
| `TabsProps`               | type | `import type {TabsProps} from "@vishnu/ui-component"`               | `./ui-component/tabs/type`                        |
| `ButtonVariant`           | type | `import type {ButtonVariant} from "@vishnu/ui-component"`           | `./ui-component/button/type`                      |
| `ButtonColor`             | type | `import type {ButtonColor} from "@vishnu/ui-component"`             | `./ui-component/button/type`                      |
| `ButtonSize`              | type | `import type {ButtonSize} from "@vishnu/ui-component"`              | `./ui-component/button/type`                      |
| `ButtonProps`             | type | `import type {ButtonProps} from "@vishnu/ui-component"`             | `./ui-component/button/type`                      |
| `ButtonGroupProps`        | type | `import type {ButtonGroupProps} from "@vishnu/ui-component"`        | `./ui-component/button/type`                      |
| `ChipProps`               | type | `import type {ChipProps} from "@vishnu/ui-component"`               | `./ui-component/chip/type`                        |
| `ChipColorsType`          | type | `import type {ChipColorsType} from "@vishnu/ui-component"`          | `./ui-component/chip/type`                        |
| `ChipSizeType`            | type | `import type {ChipSizeType} from "@vishnu/ui-component"`            | `./ui-component/chip/type`                        |
| `ChipVariant`             | type | `import type {ChipVariant} from "@vishnu/ui-component"`             | `./ui-component/chip/type`                        |
| `RatingProps`             | type | `import type {RatingProps} from "@vishnu/ui-component"`             | `./ui-component/rating/type`                      |
| `RatingSize`              | type | `import type {RatingSize} from "@vishnu/ui-component"`              | `./ui-component/rating/type`                      |
| `RatingColor`             | type | `import type {RatingColor} from "@vishnu/ui-component"`             | `./ui-component/rating/type`                      |
| `ProgressBarProps`        | type | `import type {ProgressBarProps} from "@vishnu/ui-component"`        | `./ui-component/progressBar/type`                 |
| `ProgressBarColor`        | type | `import type {ProgressBarColor} from "@vishnu/ui-component"`        | `./ui-component/progressBar/type`                 |
| `ProgressBarSize`         | type | `import type {ProgressBarSize} from "@vishnu/ui-component"`         | `./ui-component/progressBar/type`                 |
| `ProgressBarVariant`      | type | `import type {ProgressBarVariant} from "@vishnu/ui-component"`      | `./ui-component/progressBar/type`                 |
| `CircularProgressProps`   | type | `import type {CircularProgressProps} from "@vishnu/ui-component"`   | `./ui-component/progressBar/CircularProgressType` |
| `CircularProgressColor`   | type | `import type {CircularProgressColor} from "@vishnu/ui-component"`   | `./ui-component/progressBar/CircularProgressType` |
| `CircularProgressVariant` | type | `import type {CircularProgressVariant} from "@vishnu/ui-component"` | `./ui-component/progressBar/CircularProgressType` |
| `PageTitleProps`          | type | `import type {PageTitleProps} from "@vishnu/ui-component"`          | `./ui-component/text/type`                        |
| `AlertOverlayPosition`    | type | `import type {AlertOverlayPosition} from "@vishnu/ui-component"`    | `./ui-component/alert/type`                       |
| `AlertSeverity`           | type | `import type {AlertSeverity} from "@vishnu/ui-component"`           | `./ui-component/alert/type`                       |
| `AlertInput`              | type | `import type {AlertInput} from "@vishnu/ui-component"`              | `./ui-component/alert/type`                       |
| `AlertItem`               | type | `import type {AlertItem} from "@vishnu/ui-component"`               | `./ui-component/alert/type`                       |
| `BrowserName`             | type | `import type {BrowserName} from "@vishnu/ui-component"`             | `./hooks/useBrowserSupport`                      |
| `BrowserInfo`             | type | `import type {BrowserInfo} from "@vishnu/ui-component"`             | `./hooks/useBrowserSupport`                      |
| `MinBrowserVersions`      | type | `import type {MinBrowserVersions} from "@vishnu/ui-component"`      | `./hooks/useBrowserSupport`                      |
| `AccordionProps`           | type | `import type {AccordionProps} from "@vishnu/ui-component"`           | `./ui-component/accordion/type`                   |
| `EmptyDataProps`          | type | `import type {EmptyDataProps} from "@vishnu/ui-component"`          | `./ui-component/emptyData/type`                   |
| `QrCodeProps`             | type | `import type {QrCodeProps} from "@vishnu/ui-component"`             | `./ui-component/qrCode/type`                      |
| `StepperProps`             | type | `import type {StepperProps} from "@vishnu/ui-component"`             | `./ui-component/stepper/type`                     |
| `StepperStep`              | type | `import type {StepperStep} from "@vishnu/ui-component"`              | `./ui-component/stepper/type`                     |
| `StepperOrientation`       | type | `import type {StepperOrientation} from "@vishnu/ui-component"`       | `./ui-component/stepper/type`                     |
| `StepStatus`               | type | `import type {StepStatus} from "@vishnu/ui-component"`               | `./ui-component/stepper/type`                     |
| `StepperSize`              | type | `import type {StepperSize} from "@vishnu/ui-component"`              | `./ui-component/stepper/type`                     |
| `SliderProps` | type | `import type {SliderProps} from "@vishnu/ui-component"` | `./ui-component/slider/type` |
| `SliderInputProps` | type | `import type {SliderInputProps} from "@vishnu/ui-component"` | `./ui-component/slider/type` |
| `SliderMarkProps` | type | `import type {SliderMarkProps} from "@vishnu/ui-component"` | `./ui-component/slider/type` |
| `RichTextEditorProps` | type | `import type {RichTextEditorProps} from "@vishnu/ui-component"` | `./ui-component/richTextEditor/type` |
| `RipplePointer` | type | `import type {RipplePointer} from "@vishnu/ui-component/utils"` | `./utils/ripple` |
| `TranslationProviderProps` | type | `import type {TranslationProviderProps} from "@vishnu/ui-component/hooks"` | `./hooks/TranslationProvider` |
| `TimerFormatter` | type | `import type {TimerFormatter} from "@vishnu/ui-component"` | `./hooks/useTimer` |
| `EmptyStateProps` | type | `import type {EmptyStateProps} from "@vishnu/ui-component"` | `./ui-component/emptyData/type` |
| `FormRules` | type | `import type {FormRules} from "@vishnu/ui-component"` | `./types/form` |
| `FormRulesOptions` | type | `import type {FormRulesOptions} from "@vishnu/ui-component"` | `./types/form` |
| `PasswordRules` | type | `import type {PasswordRules} from "@vishnu/ui-component"` | `./types/form` |
| `Language` | type | `import type {Language} from "@vishnu/ui-component"` | `./types/translations` |
| `TranslationKey` | type | `import type {TranslationKey} from "@vishnu/ui-component"` | `./types/translations` |
| `TranslationMap` | type | `import type {TranslationMap} from "@vishnu/ui-component"` | `./types/translations` |

## Notes for Agents and Contributors

- Treat this file and `docs/PUBLIC_API.json` as the canonical public API references.
- If `index.ts` or `package.json#exports` changes, update both files in the same change.
- Prefer root imports in all examples and generated code unless new exports are intentionally added.
