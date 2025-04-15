import { useMemo, useState } from 'react';
import './Calendar.css';
import { Day, DayStatus, Month, Weekday } from './types';

const changeDate = (date: Date, changeYear: number = 0, changeMonth: number = 0): Date => {
  const newDate = new Date(date.getTime())
  if (changeYear != 0) {
    newDate.setUTCFullYear(date.getUTCFullYear() + changeYear);
  } else {
    newDate.setUTCMonth(date.getUTCMonth() + changeMonth);
  }
  return newDate;
};

const getDaysArrayForCurrentMonth = (date: Date, today: Date): Day[] => {
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth();
  const firstDayOfMonth = new Date(Date.UTC(year, month, 1));
  const lastDayOfMonth = new Date(Date.UTC(year, month + 1, 1));
  lastDayOfMonth.setUTCDate(0);
  const daysInMonth = lastDayOfMonth.getUTCDate();
  const firstWeekdayOfTheMonth = firstDayOfMonth.getUTCDay();
  const lastWeekdayOfTheMonth = lastDayOfMonth.getUTCDay();

  let daysArray: Day[] = [];
  for (let prefixDays = 0; prefixDays < firstWeekdayOfTheMonth; prefixDays++) {
    daysArray.push({ title: '', status: DayStatus.NotInMonth });
  }
  for (let day = 1; day <= daysInMonth; day++) {
    let status = DayStatus.Regular;
    if (date.getUTCFullYear() != today.getUTCFullYear() || date.getUTCMonth() != today.getUTCMonth()) {
      status = DayStatus.DifferentMonth;
    } else if (day == date.getUTCDate()) {
      status = DayStatus.Today;
      daysArray.push({ title: ''+day, status, slots: [{ title: 'Slot 1' }, { title: 'Slot 2' }] });
      continue;
    }
    daysArray.push({ title: ''+day, status });
  }
  for (let suffixDays = lastWeekdayOfTheMonth; suffixDays < 6; suffixDays++) {
    daysArray.push({ title: '', status: DayStatus.NotInMonth });
  }

  return daysArray;
}

const Calendar = () => {
  const [ selectedDate, setSelectedDate ] = useState<Date>(new Date());
  const [ today ] = useState<Date>(new Date());
  const year = useMemo(() => selectedDate.getUTCFullYear(), [selectedDate]);
  const month = useMemo(() => selectedDate.getUTCMonth(), [selectedDate]);
  const daysArray = useMemo(() => getDaysArrayForCurrentMonth(selectedDate, today), [selectedDate, today]);

  return (
    <div className='calendar'>
      <div className='selector'>
        <button onClick={ () => setSelectedDate(today) }>Today</button>
      </div>
      <div className='selector'>
        <button onClick={ () => setSelectedDate(date => changeDate(date, -1)) }>&lt;</button><p>Year: { year }</p><button onClick={ () => setSelectedDate(date => changeDate(date, 1)) }>&gt;</button>
      </div>
      <div className='selector'>
        <button onClick={ () => setSelectedDate(date => changeDate(date, 0, -1)) }>&lt;</button><p>Month: { Object.values(Month)[month] }</p><button onClick={ () => setSelectedDate(date => changeDate(date, 0, 1)) }>&gt;</button>
      </div>
      <div className='weekgrid'>
        { Object.values(Weekday).map((weekday, index) => (<div className='head' key={ weekday+''+index }>{ weekday }</div>)) }
        { daysArray.map((day, index) => (
          <div className={ day.status }key={ index }>
            { day.title }
            { day.slots?.map((slot, index) => (<span key={ index }>{ slot.title }</span>)) }
          </div>)) }
      </div>
    </div>
  );
};

export default Calendar;