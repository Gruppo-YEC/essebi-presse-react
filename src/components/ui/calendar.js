import React from 'react';
import { DayPicker, useDayPicker } from 'react-day-picker';
import { it } from 'react-day-picker/locale';
import 'react-day-picker/style.css';
import '../../css/calendar.css';
import { cn } from './utils';

/**
 * Calendario shadcn-style basato su react-day-picker v9.
 * Lo stile usa le CSS custom properties di DayPicker rimappate sui token
 * del framework (vedi calendar.css), quindi segue tema chiaro/scuro.
 *
 * Intestazione su due righe: sopra la tendina dell'anno (si salta da un anno
 * all'altro senza cliccare 12 volte sulle frecce), sotto freccia, tendina del
 * mese, freccia. Il range degli anni va da `fromYear` a `toYear` (default
 * 1900 → anno corrente + 20).
 */

/* DayPicker, con captionLayout='dropdown', passa qui come children le due
   tendine (mese, anno) già pronte: le ridispongo e aggiungo le frecce del
   mese, che il Nav standard metterebbe in alto a destra sopra l'anno */
function CaptionNav({ children, className, ...props }) {
    const { previousMonth, nextMonth, goToMonth, components, classNames, labels } = useDayPicker();
    const [monthDropdown, yearDropdown] = React.Children.toArray(children);

    return (
        <div className={cn(className, 'ckd-caption')} {...props}>
            <div className='ckd-caption-year'>{yearDropdown}</div>
            <div className='ckd-caption-month'>
                <button
                    type='button'
                    className={classNames.button_previous}
                    tabIndex={previousMonth ? undefined : -1}
                    aria-disabled={previousMonth ? undefined : true}
                    aria-label={labels.labelPrevious(previousMonth)}
                    onClick={() => { if (previousMonth) goToMonth(previousMonth); }}
                >
                    <components.Chevron orientation='left' className={classNames.chevron} disabled={previousMonth ? undefined : true} />
                </button>
                {monthDropdown}
                <button
                    type='button'
                    className={classNames.button_next}
                    tabIndex={nextMonth ? undefined : -1}
                    aria-disabled={nextMonth ? undefined : true}
                    aria-label={labels.labelNext(nextMonth)}
                    onClick={() => { if (nextMonth) goToMonth(nextMonth); }}
                >
                    <components.Chevron orientation='right' className={classNames.chevron} disabled={nextMonth ? undefined : true} />
                </button>
            </div>
        </div>
    );
}

const Calendar = ({ className, fromYear = 1900, toYear = new Date().getFullYear() + 20, components, ...props }) => (
    <DayPicker
        locale={it}
        weekStartsOn={1}
        showOutsideDays
        captionLayout='dropdown'
        hideNavigation
        startMonth={new Date(fromYear, 0, 1)}
        endMonth={new Date(toYear, 11, 31)}
        components={{ DropdownNav: CaptionNav, ...components }}
        className={cn('ckd-daypicker', className)}
        {...props}
    />
);
Calendar.displayName = 'Calendar';

export { Calendar };
