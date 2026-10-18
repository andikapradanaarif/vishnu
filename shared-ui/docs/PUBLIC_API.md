# Public API Reference

Canonical human-readable API reference for `@nexus/ui-component`.

This file is a companion to `docs/PUBLIC_API.json` and should stay aligned with:

- `index.ts`
- `package.json#exports`

## Package

- **Name**: `@nexus/ui-component`
- **Version**: `1.0.0`
- **Last audited**: `2026-10-17`

## Supported Entry Points

The following entrypoints are supported:

1. `@nexus/ui-component` — root barrel (curated: components, their prop types, and common hooks; the full helper surface is in the `utils` and `hooks` subpaths)
2. `@nexus/ui-component/styles.css` — global stylesheet
3. Per-component subpaths (for tree-shaking):
   - `@nexus/ui-component/accordion`
   - `@nexus/ui-component/actionBar`
   - `@nexus/ui-component/alert`
   - `@nexus/ui-component/breadcrumb`
   - `@nexus/ui-component/browserWarning`
   - `@nexus/ui-component/button`
   - `@nexus/ui-component/calendar`
   - `@nexus/ui-component/chip`
   - `@nexus/ui-component/clickOutside`
   - `@nexus/ui-component/dataList`
   - `@nexus/ui-component/dialog`
   - `@nexus/ui-component/drawer`
   - `@nexus/ui-component/emptyData`
   - `@nexus/ui-component/emptyState`
   - `@nexus/ui-component/form`
   - `@nexus/ui-component/hooks`
   - `@nexus/ui-component/input`
   - `@nexus/ui-component/loadingAnimation`
   - `@nexus/ui-component/menu`
   - `@nexus/ui-component/message`
   - `@nexus/ui-component/pagination`
   - `@nexus/ui-component/popover`
   - `@nexus/ui-component/progressBar`
   - `@nexus/ui-component/qrCode`
   - `@nexus/ui-component/rating`
   - `@nexus/ui-component/richTextEditor`
   - `@nexus/ui-component/slider`
   - `@nexus/ui-component/stepper`
   - `@nexus/ui-component/table`
   - `@nexus/ui-component/tabs`
   - `@nexus/ui-component/text`
   - `@nexus/ui-component/timePicker`
   - `@nexus/ui-component/tooltip`
   - `@nexus/ui-component/userImageIcon`
   - `@nexus/ui-component/utils`
   - `@nexus/ui-component/wrapper`

## Import Policy

- Import components and their prop types from `@nexus/ui-component`; utility helpers are exported from `@nexus/ui-component/utils` and the extended hook surface from `@nexus/ui-component/hooks` (the root barrel is a curated subset).
- Import stylesheet from `@nexus/ui-component/styles.css`.
- For maximum tree-shaking, import from per-component subpaths:

```ts
// Root barrel (curated: components and their prop types)
import {Button, Input, Tabs} from "@nexus/ui-component";
import type {TabsProps} from "@nexus/ui-component";

// Per-component subpath (tree-shaken)
import {Button} from "@nexus/ui-component/button";
import {Input, Select} from "@nexus/ui-component/input";
```

The stylesheet is loaded through the consumer's Tailwind-processed CSS
entry (`@import "tailwindcss"; @import "@nexus/ui-component/styles.css";
@source ...` — see `docs/user-guide/styling.md`), not a JS import. It
declares its `--color-*` tokens with Tailwind's `@theme` directive, so
**Tailwind CSS v4.3.3 or newer is required** (`tailwindcss` is a peer
dependency); the library provides no v3 fallback.

## Public Exports

### Components / Values (140)

| Export                  | Kind      | Canonical Import                                            | Source Specifier                                 | Source Export                  |
| ----------------------- | --------- | ----------------------------------------------------------- | ------------------------------------------------ | ------------------------------ |
| `ActionBar`             | component | `import {ActionBar} from "@nexus/ui-component"`             | `./ui-component/actionBar/ActionBar`             | named                          |
| `Breadcrumb`            | component | `import {Breadcrumb} from "@nexus/ui-component"`            | `./ui-component/breadcrumb/Breadcrumb`           | named                          |
| `Button`                | component | `import {Button} from "@nexus/ui-component"`                | `./ui-component/button/Button`                   | named                          |
| `ButtonGroup`           | component | `import {ButtonGroup} from "@nexus/ui-component"`           | `./ui-component/button/ButtonGroup`              | named                          |
| `BrowserNotSupportedDialog` | component | `import {BrowserNotSupportedDialog} from "@nexus/ui-component"` | `./ui-component/browserWarning/BrowserNotSupportedDialog` | named                |
| `Calendar`              | component | `import {Calendar} from "@nexus/ui-component"`              | `./ui-component/calendar/Calendar`               | named                          |
| `Chip`                  | component | `import {Chip} from "@nexus/ui-component"`                  | `./ui-component/chip/Chip`                       | named                          |
| `DataList`              | component | `import {DataList} from "@nexus/ui-component"`              | `./ui-component/dataList/DataList`               | named                          |
| `Dialog`                | component | `import {Dialog} from "@nexus/ui-component"`                | `./ui-component/dialog/Dialog`                   | named                          |
| `Drawer`                | component | `import {Drawer} from "@nexus/ui-component"`                | `./ui-component/drawer/Drawer`                   | named                          |
| `Input`                 | component | `import {Input} from "@nexus/ui-component"`                 | `./ui-component/input/Input`                     | default (re-exported as named) |
| `PasswordInput`         | component | `import {PasswordInput} from "@nexus/ui-component"`         | `./ui-component/input/PasswordInput`             | default (re-exported as named) |
| `Message`               | component | `import {Message} from "@nexus/ui-component"`               | `./ui-component/message/Message`                 | default (re-exported as named) |
| `Pagination`            | component | `import {Pagination} from "@nexus/ui-component"`            | `./ui-component/pagination/Pagination`           | named                          |
| `Popover`               | component | `import {Popover} from "@nexus/ui-component"`               | `./ui-component/popover/Popover`                 | named                          |
| `RichDescription`       | component | `import {RichDescription} from "@nexus/ui-component"`       | `./ui-component/richDescription/RichDescription` | named                          |
| `Table`                 | component | `import {Table} from "@nexus/ui-component"`                 | `./ui-component/table/Table`                     | named                          |
| `Tooltip`               | component | `import {Tooltip} from "@nexus/ui-component"`               | `./ui-component/tooltip/Tooltip`                 | named                          |
| `Select`                | component | `import {Select} from "@nexus/ui-component"`                | `./ui-component/input/Select`                    | default (re-exported as named) |
| `TextAreaInput`         | component | `import {TextAreaInput} from "@nexus/ui-component"`         | `./ui-component/input/TextAreaInput`             | default (re-exported as named) |
| `Tabs`                  | component | `import {Tabs} from "@nexus/ui-component"`                  | `./ui-component/tabs/Tabs`                       | default (re-exported as named) |
| `Checkbox`              | component | `import {Checkbox} from "@nexus/ui-component"`              | `./ui-component/input/Checkbox`                  | named                          |
| `Switch`                | component | `import {Switch} from "@nexus/ui-component"`                | `./ui-component/input/Switch`                    | named                          |
| `Radio`                 | component | `import {Radio} from "@nexus/ui-component"`                 | `./ui-component/input/Radio`                     | named                          |
| `DatePicker`            | component | `import {DatePicker} from "@nexus/ui-component"`            | `./ui-component/input/DatePicker`                | named                          |
| `DateRangePicker`       | component | `import {DateRangePicker} from "@nexus/ui-component"`       | `./ui-component/input/DateRangePicker`           | named                          |
| `MultipleSelect`        | component | `import {MultipleSelect} from "@nexus/ui-component"`        | `./ui-component/input/MultipleSelect`            | default (re-exported as named) |
| `SearchInput`           | component | `import {SearchInput} from "@nexus/ui-component"`           | `./ui-component/input/SearchInput`               | default (re-exported as named) |
| `SegmentedControl`      | component | `import {SegmentedControl} from "@nexus/ui-component"`      | `./ui-component/input/SegmentedControl`          | named                          |
| `LoadingAnimation`      | component | `import {LoadingAnimation} from "@nexus/ui-component"`      | `./ui-component/loadingAnimation/LoadingDots`    | named                          |
| `LoadingSpinner`        | component | `import {LoadingSpinner} from "@nexus/ui-component"`        | `./ui-component/loadingAnimation/LoadingSpinner` | default (re-exported as named) |
| `FormValidator`         | component | `import {FormValidator} from "@nexus/ui-component"`         | `./ui-component/form/FormValidator`              | default (re-exported as named) |
| `PasswordFormValidator` | component | `import {PasswordFormValidator} from "@nexus/ui-component"` | `./ui-component/form/PasswordFormValidator`      | default (re-exported as named) |
| `DateTimeValidator`     | component | `import {DateTimeValidator} from "@nexus/ui-component"`     | `./ui-component/form/DateTimeValidator`          | named                          |
| `TimeTrackingValidator` | component | `import {TimeTrackingValidator} from "@nexus/ui-component"` | `./ui-component/form/TimeTrackingValidator`      | default (re-exported as named) |
| `Title`                 | component | `import {Title} from "@nexus/ui-component"`                 | `./ui-component/text/Title`                      | default (re-exported as named) |
| `Subtitle`              | component | `import {Subtitle} from "@nexus/ui-component"`              | `./ui-component/text/Subtitle`                   | default (re-exported as named) |
| `Caption`               | component | `import {Caption} from "@nexus/ui-component"`               | `./ui-component/text/Caption`                    | default (re-exported as named) |
| `Paragraph`             | component | `import {Paragraph} from "@nexus/ui-component"`             | `./ui-component/text/Paragraph`                  | default (re-exported as named) |
| `Rating` | component | `import {Rating} from "@nexus/ui-component"` | `./ui-component/rating/Rating` | named |
| `ProgressBar` | component | `import {ProgressBar} from "@nexus/ui-component"` | `./ui-component/progressBar/ProgressBar` | named |
| `CircularProgress` | component | `import {CircularProgress} from "@nexus/ui-component"` | `./ui-component/progressBar/CircularProgress` | named |
| `PageTitle` | component | `import {PageTitle} from "@nexus/ui-component"` | `./ui-component/text/PageTitle` | default (re-exported as named) |
| `Alert` | component | `import {Alert} from "@nexus/ui-component"` | `./ui-component/alert/Alert` | default (re-exported as named) |
| `AlertInline` | component | `import {AlertInline} from "@nexus/ui-component"` | `./ui-component/alert/AlertInline` | default (re-exported as named) |
| `AlertToast` | component | `import {AlertToast} from "@nexus/ui-component"` | `./ui-component/alert/AlertToast` | default (re-exported as named) |
| `ClickOutside` | component | `import {ClickOutside} from "@nexus/ui-component"` | `./ui-component/clickOutside/ClickOutSide` | named |
| `Skeleton` | component | `import {Skeleton} from "@nexus/ui-component"` | `./ui-component/loadingAnimation/Skeleton` | default (re-exported as named) |
| `MenuItem` | component | `import {MenuItem} from "@nexus/ui-component"` | `./ui-component/menu/MenuItem` | default (re-exported as named) |
| `MenuLink` | component | `import {MenuLink} from "@nexus/ui-component"` | `./ui-component/menu/MenuLink` | named |
| `UserImageIcon` | component | `import {UserImageIcon} from "@nexus/ui-component"` | `./ui-component/userImageIcon/UserImageIcon` | default (re-exported as named) |
| `UserAvatarFallback` | component | `import {UserAvatarFallback} from "@nexus/ui-component"` | `./ui-component/userImageIcon/UserAvatarFallback` | named |
| `Accordion` | component | `import {Accordion} from "@nexus/ui-component"` | `./ui-component/accordion/Accordion` | named |
| `EmptyData` | component | `import {EmptyData} from "@nexus/ui-component"` | `./ui-component/emptyData/EmptyData` | named |
| `QrCode` | component | `import {QrCode} from "@nexus/ui-component"` | `./ui-component/qrCode/QrCode` | named |
| `Stepper` | component | `import {Stepper} from "@nexus/ui-component"` | `./ui-component/stepper/Stepper` | named |
| `Slider` | component | `import {Slider} from "@nexus/ui-component"` | `./ui-component/slider/Slider` | named |
| `RichTextEditor` | component | `import {RichTextEditor} from "@nexus/ui-component"` | `./ui-component/richTextEditor/RichTextEditor` | default (re-exported as named) |
| `ContentWrapper` | component | `import {ContentWrapper} from "@nexus/ui-component"` | `./ui-component/wrapper/ContentWrapper` | default (re-exported as named) |
| `PageWrapper` | component | `import {PageWrapper} from "@nexus/ui-component"` | `./ui-component/wrapper/PageWrapper` | default (re-exported as named) |
| `FormList` | component | `import {FormList} from "@nexus/ui-component"` | `./ui-component/form/FormList` | named |
| `TimePicker` | component | `import {TimePicker} from "@nexus/ui-component"` | `./ui-component/input/timePicker/TimePicker` | default (re-exported as named) |
| `delay` | value | `import {delay} from "@nexus/ui-component"` | `./utils/async` | named |
| `getStringHash` | value | `import {getStringHash} from "@nexus/ui-component"` | `./utils/string` | named |
| `decodeHtml` | value | `import {decodeHtml} from "@nexus/ui-component"` | `./utils/string` | named |
| `getFullName` | value | `import {getFullName} from "@nexus/ui-component"` | `./utils/string` | named |
| `pasteFromClipboard` | value | `import {pasteFromClipboard} from "@nexus/ui-component"` | `./utils/string` | named |
| `getLocaledDateTimeString` | value | `import {getLocaledDateTimeString} from "@nexus/ui-component"` | `./utils/time` | named |
| `stringComparisonFn` | value | `import {stringComparisonFn} from "@nexus/ui-component"` | `./utils/sorting` | named |
| `numberComparisonFn` | value | `import {numberComparisonFn} from "@nexus/ui-component"` | `./utils/sorting` | named |
| `dateComparisonFn` | value | `import {dateComparisonFn} from "@nexus/ui-component"` | `./utils/sorting` | named |
| `downloadUrlViaDOM` | value | `import {downloadUrlViaDOM} from "@nexus/ui-component"` | `./utils/download` | named |
| `dataSourceFormatter` | value | `import {dataSourceFormatter} from "@nexus/ui-component"` | `./utils/table` | named |
| `EMPTY_RICH_TEXT_VALUE` | value | `import {EMPTY_RICH_TEXT_VALUE} from "@nexus/ui-component"` | `./utils/richText` | named |
| `createEmptyRichTextValue` | value | `import {createEmptyRichTextValue} from "@nexus/ui-component"` | `./utils/richText` | named |
| `serializeRichText` | value | `import {serializeRichText} from "@nexus/ui-component"` | `./utils/richText` | named |
| `deserializeRichText` | value | `import {deserializeRichText} from "@nexus/ui-component"` | `./utils/richText` | named |
| `isRichTextEmpty` | value | `import {isRichTextEmpty} from "@nexus/ui-component"` | `./utils/richText` | named |
| `serializeRichTextToHtml` | value | `import {serializeRichTextToHtml} from "@nexus/ui-component"` | `./utils/richText` | named |
| `useDebounce` | hook | `import {useDebounce} from "@nexus/ui-component"` | `./hooks/useDebounce` | named |
| `useDebounceFunc` | hook | `import {useDebounceFunc} from "@nexus/ui-component"` | `./hooks/useDebounce` | named |
| `useTimer` | hook | `import {useTimer} from "@nexus/ui-component"` | `./hooks/useTimer` | named |
| `useBrowserSupport` | hook | `import {useBrowserSupport} from "@nexus/ui-component"` | `./hooks/useBrowserSupport` | named |
| `useRichTextField` | hook | `import {useRichTextField} from "@nexus/ui-component"` | `./hooks/useRichTextField` | named |
| `filterTree` | value | `import {filterTree} from "@nexus/ui-component/utils"` | `./utils/array` | named |
| `flatten` | value | `import {flatten} from "@nexus/ui-component/utils"` | `./utils/array` | named |
| `isSameTime` | value | `import {isSameTime} from "@nexus/ui-component/utils"` | `./utils/date` | named |
| `intlFormatDate` | value | `import {intlFormatDate} from "@nexus/ui-component/utils"` | `./utils/date` | named |
| `intlFormatDateWithTime` | value | `import {intlFormatDateWithTime} from "@nexus/ui-component/utils"` | `./utils/date` | named |
| `shortWeekNames` | value | `import {shortWeekNames} from "@nexus/ui-component/utils"` | `./utils/date` | named |
| `monthsNames` | value | `import {monthsNames} from "@nexus/ui-component/utils"` | `./utils/date` | named |
| `getYearsUntilNow` | value | `import {getYearsUntilNow} from "@nexus/ui-component/utils"` | `./utils/date` | named |
| `listYears` | value | `import {listYears} from "@nexus/ui-component/utils"` | `./utils/date` | named |
| `getStartOfDay` | value | `import {getStartOfDay} from "@nexus/ui-component/utils"` | `./utils/date` | named |
| `getEndOfDay` | value | `import {getEndOfDay} from "@nexus/ui-component/utils"` | `./utils/date` | named |
| `getStartOfMonth` | value | `import {getStartOfMonth} from "@nexus/ui-component/utils"` | `./utils/date` | named |
| `getEndOfMonth` | value | `import {getEndOfMonth} from "@nexus/ui-component/utils"` | `./utils/date` | named |
| `getStartOfWeek` | value | `import {getStartOfWeek} from "@nexus/ui-component/utils"` | `./utils/date` | named |
| `getEndOfWeek` | value | `import {getEndOfWeek} from "@nexus/ui-component/utils"` | `./utils/date` | named |
| `getStartOfYear` | value | `import {getStartOfYear} from "@nexus/ui-component/utils"` | `./utils/date` | named |
| `getEndOfYear` | value | `import {getEndOfYear} from "@nexus/ui-component/utils"` | `./utils/date` | named |
| `getDateBeforeMonths` | value | `import {getDateBeforeMonths} from "@nexus/ui-component/utils"` | `./utils/date` | named |
| `addDays` | value | `import {addDays} from "@nexus/ui-component/utils"` | `./utils/date` | named |
| `subDays` | value | `import {subDays} from "@nexus/ui-component/utils"` | `./utils/date` | named |
| `addWeeks` | value | `import {addWeeks} from "@nexus/ui-component/utils"` | `./utils/date` | named |
| `addMonths` | value | `import {addMonths} from "@nexus/ui-component/utils"` | `./utils/date` | named |
| `addYears` | value | `import {addYears} from "@nexus/ui-component/utils"` | `./utils/date` | named |
| `getFormattedTimeString` | value | `import {getFormattedTimeString} from "@nexus/ui-component/utils"` | `./utils/date` | named |
| `getFormattedDateString` | value | `import {getFormattedDateString} from "@nexus/ui-component/utils"` | `./utils/date` | named |
| `getDurationBetweenDates` | value | `import {getDurationBetweenDates} from "@nexus/ui-component/utils"` | `./utils/date` | named |
| `mergeDateAndTime` | value | `import {mergeDateAndTime} from "@nexus/ui-component/utils"` | `./utils/date` | named |
| `formatDateToLocalizedString` | value | `import {formatDateToLocalizedString} from "@nexus/ui-component/utils"` | `./utils/date` | named |
| `pad` | value | `import {pad} from "@nexus/ui-component/utils"` | `./utils/date` | named |
| `formatDuration` | value | `import {formatDuration} from "@nexus/ui-component/utils"` | `./utils/date` | named |
| `getDayDescription` | value | `import {getDayDescription} from "@nexus/ui-component/utils"` | `./utils/date` | named |
| `getDurationMs` | value | `import {getDurationMs} from "@nexus/ui-component/utils"` | `./utils/date` | named |
| `formatTime` | value | `import {formatTime} from "@nexus/ui-component/utils"` | `./utils/date` | named |
| `formatDate` | value | `import {formatDate} from "@nexus/ui-component/utils"` | `./utils/date` | named |
| `formatMonthYear` | value | `import {formatMonthYear} from "@nexus/ui-component/utils"` | `./utils/date` | named |
| `formatYear` | value | `import {formatYear} from "@nexus/ui-component/utils"` | `./utils/date` | named |
| `formatDateRange` | value | `import {formatDateRange} from "@nexus/ui-component/utils"` | `./utils/date` | named |
| `roundUpToNearestByMinutes` | value | `import {roundUpToNearestByMinutes} from "@nexus/ui-component/utils"` | `./utils/date` | named |
| `roundToNearestByMinutes` | value | `import {roundToNearestByMinutes} from "@nexus/ui-component/utils"` | `./utils/date` | named |
| `addHours` | value | `import {addHours} from "@nexus/ui-component/utils"` | `./utils/date` | named |
| `formatRelativeDate` | value | `import {formatRelativeDate} from "@nexus/ui-component/utils"` | `./utils/date` | named |
| `validator` | value | `import {validator} from "@nexus/ui-component/utils"` | `./utils/form` | named |
| `passwordValidator` | value | `import {passwordValidator} from "@nexus/ui-component/utils"` | `./utils/form` | named |
| `startTimeValidator` | value | `import {startTimeValidator} from "@nexus/ui-component/utils"` | `./utils/form` | named |
| `endTimeValidator` | value | `import {endTimeValidator} from "@nexus/ui-component/utils"` | `./utils/form` | named |
| `createRipple` | value | `import {createRipple} from "@nexus/ui-component/utils"` | `./utils/ripple` | named |
| `getLanguage` | value | `import {getLanguage} from "@nexus/ui-component/utils"` | `./utils/storage` | named |
| `setLanguage` | value | `import {setLanguage} from "@nexus/ui-component/utils"` | `./utils/storage` | named |
| `translate` | value | `import {translate} from "@nexus/ui-component/utils"` | `./utils/translation` | named |
| `TranslationProvider` | value | `import {TranslationProvider} from "@nexus/ui-component/hooks"` | `./hooks/TranslationProvider` | named |
| `DEFAULT_MIN_VERSIONS` | value | `import {DEFAULT_MIN_VERSIONS} from "@nexus/ui-component/hooks"` | `./hooks/useBrowserSupport` | named |
| `detectBrowser` | value | `import {detectBrowser} from "@nexus/ui-component/hooks"` | `./hooks/useBrowserSupport` | named |
| `useIsSmallerThanTablet` | hook | `import {useIsSmallerThanTablet} from "@nexus/ui-component/hooks"` | `./hooks/useScreenSize` | named |
| `useIsSmallPhone` | hook | `import {useIsSmallPhone} from "@nexus/ui-component/hooks"` | `./hooks/useScreenSize` | named |
| `useSlicedPages` | hook | `import {useSlicedPages} from "@nexus/ui-component/hooks"` | `./hooks/useSlicedPages` | named |
| `EmptyState` | component | `import {EmptyState} from "@nexus/ui-component"` | `./ui-component/emptyData/EmptyData` | named |

### Types (77)

| Export                    | Kind | Canonical Import                                                   | Source Specifier                                  |
| ------------------------- | ---- | ------------------------------------------------------------------ | ------------------------------------------------- |
| `SelectOption`            | type | `import type {SelectOption} from "@nexus/ui-component"`            | `./ui-component/input/types`                      |
| `BreadcrumbItem`          | type | `import type {BreadcrumbItem} from "@nexus/ui-component"`          | `./ui-component/breadcrumb/type`                  |
| `BreadcrumbProps`         | type | `import type {BreadcrumbProps} from "@nexus/ui-component"`         | `./ui-component/breadcrumb/type`                  |
| `UserAvatarFallbackProps` | type | `import type {UserAvatarFallbackProps} from "@nexus/ui-component"` | `./ui-component/userImageIcon/UserAvatarFallback` |
| `UserImageIconSize`       | type | `import type {UserImageIconSize} from "@nexus/ui-component"`       | `./ui-component/userImageIcon/UserAvatarFallback` |
| `DataListDirection`       | type | `import type {DataListDirection} from "@nexus/ui-component"`       | `./ui-component/dataList/type`                    |
| `DataListItemProps`       | type | `import type {DataListItemProps} from "@nexus/ui-component"`       | `./ui-component/dataList/type`                    |
| `DataListLabelProps`      | type | `import type {DataListLabelProps} from "@nexus/ui-component"`      | `./ui-component/dataList/type`                    |
| `DateTimeRules`           | type | `import type {DateTimeRules} from "@nexus/ui-component"`           | `./types/form`                                    |
| `TimeTrackingRules`       | type | `import type {TimeTrackingRules} from "@nexus/ui-component"`       | `./types/form`                                    |
| `BrowserNotSupportedDialogProps` | type | `import type {BrowserNotSupportedDialogProps} from "@nexus/ui-component"` | `./ui-component/browserWarning/type`       |
| `MenuLinkProps`           | type | `import type {MenuLinkProps} from "@nexus/ui-component"`           | `./ui-component/menu/MenuLink`                    |
| `SelectProps`             | type | `import type {SelectProps} from "@nexus/ui-component"`             | `./ui-component/input/types`                      |
| `InputProps`              | type | `import type {InputProps} from "@nexus/ui-component"`              | `./ui-component/input/types`                      |
| `TextAreaInputProps`      | type | `import type {TextAreaInputProps} from "@nexus/ui-component"`      | `./ui-component/input/types`                      |
| `RadioOption`             | type | `import type {RadioOption} from "@nexus/ui-component"`             | `./ui-component/input/types`                      |
| `RadioProps`              | type | `import type {RadioProps} from "@nexus/ui-component"`              | `./ui-component/input/types`                      |
| `SwitchProps`             | type | `import type {SwitchProps} from "@nexus/ui-component"`             | `./ui-component/input/types`                      |
| `MultipleSelectProps`     | type | `import type {MultipleSelectProps} from "@nexus/ui-component"`     | `./ui-component/input/types`                      |
| `DatePickerProps`         | type | `import type {DatePickerProps} from "@nexus/ui-component"`         | `./ui-component/input/types`                      |
| `DateRangePickerProps`    | type | `import type {DateRangePickerProps} from "@nexus/ui-component"`    | `./ui-component/input/types`                      |
| `DateRangeType`           | type | `import type {DateRangeType} from "@nexus/ui-component"`           | `./ui-component/input/types`                      |
| `SegmentedControlOption`  | type | `import type {SegmentedControlOption} from "@nexus/ui-component"`  | `./ui-component/input/types`                      |
| `SegmentedControlProps`   | type | `import type {SegmentedControlProps} from "@nexus/ui-component"`   | `./ui-component/input/types`                      |
| `SegmentedControlSize`    | type | `import type {SegmentedControlSize} from "@nexus/ui-component"`    | `./ui-component/input/types`                      |
| `TimePickerProps`         | type | `import type {TimePickerProps} from "@nexus/ui-component"`         | `./ui-component/input/types`                      |
| `Tab`                     | type | `import type {Tab} from "@nexus/ui-component"`                     | `./ui-component/tabs/type`                        |
| `TabsProps`               | type | `import type {TabsProps} from "@nexus/ui-component"`               | `./ui-component/tabs/type`                        |
| `ButtonVariant`           | type | `import type {ButtonVariant} from "@nexus/ui-component"`           | `./ui-component/button/type`                      |
| `ButtonColor`             | type | `import type {ButtonColor} from "@nexus/ui-component"`             | `./ui-component/button/type`                      |
| `ButtonSize`              | type | `import type {ButtonSize} from "@nexus/ui-component"`              | `./ui-component/button/type`                      |
| `ButtonProps`             | type | `import type {ButtonProps} from "@nexus/ui-component"`             | `./ui-component/button/type`                      |
| `ButtonGroupProps`        | type | `import type {ButtonGroupProps} from "@nexus/ui-component"`        | `./ui-component/button/type`                      |
| `ChipProps`               | type | `import type {ChipProps} from "@nexus/ui-component"`               | `./ui-component/chip/type`                        |
| `ChipColorsType`          | type | `import type {ChipColorsType} from "@nexus/ui-component"`          | `./ui-component/chip/type`                        |
| `ChipSizeType`            | type | `import type {ChipSizeType} from "@nexus/ui-component"`            | `./ui-component/chip/type`                        |
| `ChipVariant`             | type | `import type {ChipVariant} from "@nexus/ui-component"`             | `./ui-component/chip/type`                        |
| `RatingProps`             | type | `import type {RatingProps} from "@nexus/ui-component"`             | `./ui-component/rating/type`                      |
| `RatingSize`              | type | `import type {RatingSize} from "@nexus/ui-component"`              | `./ui-component/rating/type`                      |
| `RatingColor`             | type | `import type {RatingColor} from "@nexus/ui-component"`             | `./ui-component/rating/type`                      |
| `ProgressBarProps`        | type | `import type {ProgressBarProps} from "@nexus/ui-component"`        | `./ui-component/progressBar/type`                 |
| `ProgressBarColor`        | type | `import type {ProgressBarColor} from "@nexus/ui-component"`        | `./ui-component/progressBar/type`                 |
| `ProgressBarSize`         | type | `import type {ProgressBarSize} from "@nexus/ui-component"`         | `./ui-component/progressBar/type`                 |
| `ProgressBarVariant`      | type | `import type {ProgressBarVariant} from "@nexus/ui-component"`      | `./ui-component/progressBar/type`                 |
| `CircularProgressProps`   | type | `import type {CircularProgressProps} from "@nexus/ui-component"`   | `./ui-component/progressBar/CircularProgressType` |
| `CircularProgressColor`   | type | `import type {CircularProgressColor} from "@nexus/ui-component"`   | `./ui-component/progressBar/CircularProgressType` |
| `CircularProgressVariant` | type | `import type {CircularProgressVariant} from "@nexus/ui-component"` | `./ui-component/progressBar/CircularProgressType` |
| `PageTitleProps`          | type | `import type {PageTitleProps} from "@nexus/ui-component"`          | `./ui-component/text/type`                        |
| `AlertOverlayPosition`    | type | `import type {AlertOverlayPosition} from "@nexus/ui-component"`    | `./ui-component/alert/type`                       |
| `AlertSeverity`           | type | `import type {AlertSeverity} from "@nexus/ui-component"`           | `./ui-component/alert/type`                       |
| `AlertInput`              | type | `import type {AlertInput} from "@nexus/ui-component"`              | `./ui-component/alert/type`                       |
| `AlertItem`               | type | `import type {AlertItem} from "@nexus/ui-component"`               | `./ui-component/alert/type`                       |
| `BrowserName`             | type | `import type {BrowserName} from "@nexus/ui-component"`             | `./hooks/useBrowserSupport`                      |
| `BrowserInfo`             | type | `import type {BrowserInfo} from "@nexus/ui-component"`             | `./hooks/useBrowserSupport`                      |
| `MinBrowserVersions`      | type | `import type {MinBrowserVersions} from "@nexus/ui-component"`      | `./hooks/useBrowserSupport`                      |
| `AccordionProps`           | type | `import type {AccordionProps} from "@nexus/ui-component"`           | `./ui-component/accordion/type`                   |
| `EmptyDataProps`          | type | `import type {EmptyDataProps} from "@nexus/ui-component"`          | `./ui-component/emptyData/type`                   |
| `QrCodeProps`             | type | `import type {QrCodeProps} from "@nexus/ui-component"`             | `./ui-component/qrCode/type`                      |
| `StepperProps`             | type | `import type {StepperProps} from "@nexus/ui-component"`             | `./ui-component/stepper/type`                     |
| `StepperStep`              | type | `import type {StepperStep} from "@nexus/ui-component"`              | `./ui-component/stepper/type`                     |
| `StepperOrientation`       | type | `import type {StepperOrientation} from "@nexus/ui-component"`       | `./ui-component/stepper/type`                     |
| `StepStatus`               | type | `import type {StepStatus} from "@nexus/ui-component"`               | `./ui-component/stepper/type`                     |
| `StepperSize`              | type | `import type {StepperSize} from "@nexus/ui-component"`              | `./ui-component/stepper/type`                     |
| `SliderProps` | type | `import type {SliderProps} from "@nexus/ui-component"` | `./ui-component/slider/type` |
| `SliderInputProps` | type | `import type {SliderInputProps} from "@nexus/ui-component"` | `./ui-component/slider/type` |
| `SliderMarkProps` | type | `import type {SliderMarkProps} from "@nexus/ui-component"` | `./ui-component/slider/type` |
| `RichTextEditorProps` | type | `import type {RichTextEditorProps} from "@nexus/ui-component"` | `./ui-component/richTextEditor/type` |
| `RipplePointer` | type | `import type {RipplePointer} from "@nexus/ui-component/utils"` | `./utils/ripple` |
| `TranslationProviderProps` | type | `import type {TranslationProviderProps} from "@nexus/ui-component/hooks"` | `./hooks/TranslationProvider` |
| `TimerFormatter` | type | `import type {TimerFormatter} from "@nexus/ui-component"` | `./hooks/useTimer` |
| `EmptyStateProps` | type | `import type {EmptyStateProps} from "@nexus/ui-component"` | `./ui-component/emptyData/type` |
| `FormRules` | type | `import type {FormRules} from "@nexus/ui-component"` | `./types/form` |
| `FormRulesOptions` | type | `import type {FormRulesOptions} from "@nexus/ui-component"` | `./types/form` |
| `PasswordRules` | type | `import type {PasswordRules} from "@nexus/ui-component"` | `./types/form` |
| `Language` | type | `import type {Language} from "@nexus/ui-component"` | `./types/translations` |
| `TranslationKey` | type | `import type {TranslationKey} from "@nexus/ui-component"` | `./types/translations` |
| `TranslationMap` | type | `import type {TranslationMap} from "@nexus/ui-component"` | `./types/translations` |

## Notes for Agents and Contributors

- Treat this file and `docs/PUBLIC_API.json` as the canonical public API references.
- If `index.ts` or `package.json#exports` changes, update both files in the same change.
- Prefer root imports in all examples and generated code unless new exports are intentionally added.
