import { useMemo, useState } from 'react';
import '../style.css';
import { CalendarSlot, Day, DayStatus, Month, Weekday } from './types';

interface CalendarProps {
  slots: CalendarSlot[]
};

const formatTime = (hour: number, minutes: number): string => {
  return `${hour.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
};

const changeDate = (date: Date, changeYear: number = 0, changeMonth: number = 0): Date => {
  const newDate = new Date(date.getTime())
  if (changeYear != 0) {
    newDate.setUTCFullYear(date.getUTCFullYear() + changeYear);
  } else {
    newDate.setUTCMonth(date.getUTCMonth() + changeMonth);
  }
  return newDate;
};

const sortCalendarSlots = (slots: CalendarSlot[]): Map<number, CalendarSlot[]> => {
  const slotsByDate = new Map<number, CalendarSlot[]>();

  const sortedCalendarSlots = slots.sort((a, b) => (a.startTime.getTime() - b.startTime.getTime()));

  sortedCalendarSlots.forEach(calendarSlot => {
    const day = new Date(calendarSlot.startTime.getUTCFullYear(), calendarSlot.startTime.getUTCMonth(), calendarSlot.startTime.getUTCDate()).getTime();

    if (!slotsByDate.has(day)) {
      slotsByDate.set(day, []);
    }
    slotsByDate.get(day)?.push(calendarSlot);
  });

  return slotsByDate;
};

const getDaysArrayForCurrentMonth = (date: Date, today: Date, slots: CalendarSlot[]): Day[] => {
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth();
  const firstDayOfMonth = new Date(Date.UTC(year, month, 1));
  const lastDayOfMonth = new Date(Date.UTC(year, month + 1, 1));
  lastDayOfMonth.setUTCDate(0);
  const daysInMonth = lastDayOfMonth.getUTCDate();
  const firstWeekdayOfTheMonth = firstDayOfMonth.getUTCDay();
  const lastWeekdayOfTheMonth = lastDayOfMonth.getUTCDay();
  const slotsByDate = sortCalendarSlots(slots);

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
    }
    const dayTimestamp = new Date(date.getUTCFullYear(), date.getUTCMonth(), day).getTime();
    const slots = slotsByDate.get(dayTimestamp)?.map(calendarSlot => ({ id: calendarSlot.id, title: `${formatTime(calendarSlot.startTime.getUTCHours(), calendarSlot.startTime.getUTCMinutes())} - ${calendarSlot.durationInMinutes} min.` }));

    daysArray.push({ title: ''+day, status, slots });
  }
  for (let suffixDays = lastWeekdayOfTheMonth; suffixDays < 6; suffixDays++) {
    daysArray.push({ title: '', status: DayStatus.NotInMonth });
  }

  return daysArray;
};

const Calendar = ({ slots }: CalendarProps) => {
  const [ selectedDate, setSelectedDate ] = useState<Date>(new Date());
  const [ today ] = useState<Date>(new Date());
  const year = useMemo(() => selectedDate.getUTCFullYear(), [selectedDate]);
  const month = useMemo(() => selectedDate.getUTCMonth(), [selectedDate]);
  const daysArray = useMemo(() => getDaysArrayForCurrentMonth(selectedDate, today, slots), [selectedDate, today, slots]);

  return (
    <div className='calendar'>
      <div className='selector'>
        <p>&nbsp;</p><button onClick={ () => setSelectedDate(today) }>Today</button><p>&nbsp;</p>
      </div>
      <div className='selector'>
        <button onClick={ () => setSelectedDate(date => changeDate(date, -1)) }>&lt;</button><p><b>Year:</b> { year }</p><button onClick={ () => setSelectedDate(date => changeDate(date, 1)) }>&gt;</button>
      </div>
      <div className='selector'>
        <button onClick={ () => setSelectedDate(date => changeDate(date, 0, -1)) }>&lt;</button><p><b>Month:</b> { Object.values(Month)[month] }</p><button onClick={ () => setSelectedDate(date => changeDate(date, 0, 1)) }>&gt;</button>
      </div>
      <div className='weekgrid'>
        { Object.values(Weekday).map((weekday, index) => (<div className='head' key={ weekday+''+index }>{ weekday }</div>)) }
        { daysArray.map((day, index) => (
          <div className={ day.status }key={ index }>
            { day.title }
            { day.slots?.map((slot, index) => (<span className='smalltext' key={ index }>{ slot.title }</span>)) }
          </div>)) }
      </div>
    </div>
  );
};

export default Calendar;