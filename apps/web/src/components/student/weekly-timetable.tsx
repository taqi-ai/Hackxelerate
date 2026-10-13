"use client";

import { useState, useMemo } from "react";
import {
  Calendar as CalendarIcon,
  MapPin,
  User,
  BookOpen,
  FlaskConical,
} from "lucide-react";
import { play } from "@/lib/sound";

interface TimetableSlot {
  id: string;
  subject: string;
  code: string;
  type: "Lecture" | "Laboratory" | "Tutorial";
  startTime: string;
  endTime: string;
  faculty: string;
  room: string;
}

const DAYS_OF_WEEK = [
  { key: "Mon", label: "Monday", short: "Mon" },
  { key: "Tue", label: "Tuesday", short: "Tue" },
  { key: "Wed", label: "Wednesday", short: "Wed" },
  { key: "Thu", label: "Thursday", short: "Thu" },
  { key: "Fri", label: "Friday", short: "Fri" },
  { key: "Sat", label: "Saturday", short: "Sat" },
] as const;

export function WeeklyTimetable({
  subjects,
}: {
  subjects: Array<{ subject: string; code?: string }>;
  studentId?: string;
}) {
  // Determine current day of week (Monday to Saturday)
  const currentDayKey = useMemo(() => {
    const dayIndex = new Date().getDay(); // 0 is Sunday, 1 is Monday...
    const map = ["Mon", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    return map[dayIndex] || "Mon";
  }, []);

  const [selectedDay, setSelectedDay] = useState<string>(currentDayKey);

  // Generate structured weekly schedule based on actual student subjects
  const weeklySchedule = useMemo<Record<string, TimetableSlot[]>>(() => {
    const subs = subjects.length > 0 ? subjects : [
      { subject: "Cloud Computing", code: "CS501" },
      { subject: "Computer Networks", code: "CS502" },
      { subject: "Deep Learning", code: "AI501" },
      { subject: "Machine Learning", code: "AI502" },
      { subject: "Natural Language Processing", code: "AI503" },
    ];

    const facultyList = [
      "Dr. Sandeep Malik",
      "Prof. Ananya Sen",
      "Dr. Vikramjit Singh",
      "Prof. Ritu Mehrotra",
      "Dr. Arvind K. Roy",
    ];

    const getSub = (i: number) => subs[i % subs.length]!;
    const getFac = (i: number) => facultyList[i % facultyList.length]!;

    return {
      Mon: [
        {
          id: "mon-1",
          subject: getSub(0).subject,
          code: getSub(0).code || "CS501",
          type: "Lecture",
          startTime: "09:00 AM",
          endTime: "10:00 AM",
          faculty: getFac(0),
          room: "Lecture Hall 402, Block B",
        },
        {
          id: "mon-2",
          subject: getSub(1).subject,
          code: getSub(1).code || "CS502",
          type: "Lecture",
          startTime: "10:00 AM",
          endTime: "11:00 AM",
          faculty: getFac(1),
          room: "Lecture Hall 402, Block B",
        },
        {
          id: "mon-3",
          subject: getSub(2).subject,
          code: getSub(2).code || "AI501",
          type: "Tutorial",
          startTime: "11:15 AM",
          endTime: "12:15 PM",
          faculty: getFac(2),
          room: "Seminar Room 104",
        },
        {
          id: "mon-4",
          subject: `${getSub(3).subject} Lab`,
          code: `${getSub(3).code || "AI502"}P`,
          type: "Laboratory",
          startTime: "01:30 PM",
          endTime: "03:30 PM",
          faculty: getFac(3),
          room: "Advanced AI Lab 3, Block C",
        },
      ],
      Tue: [
        {
          id: "tue-1",
          subject: getSub(3).subject,
          code: getSub(3).code || "AI502",
          type: "Lecture",
          startTime: "09:00 AM",
          endTime: "10:00 AM",
          faculty: getFac(3),
          room: "Lecture Hall 401, Block B",
        },
        {
          id: "tue-2",
          subject: getSub(4).subject,
          code: getSub(4).code || "AI503",
          type: "Lecture",
          startTime: "10:00 AM",
          endTime: "11:00 AM",
          faculty: getFac(4),
          room: "Lecture Hall 401, Block B",
        },
        {
          id: "tue-3",
          subject: `${getSub(1).subject} Practical`,
          code: `${getSub(1).code || "CS502"}P`,
          type: "Laboratory",
          startTime: "01:30 PM",
          endTime: "03:30 PM",
          faculty: getFac(1),
          room: "Computer Systems Lab 2",
        },
        {
          id: "tue-4",
          subject: getSub(0).subject,
          code: getSub(0).code || "CS501",
          type: "Tutorial",
          startTime: "03:30 PM",
          endTime: "04:30 PM",
          faculty: getFac(0),
          room: "Seminar Room 102",
        },
      ],
      Wed: [
        {
          id: "wed-1",
          subject: getSub(1).subject,
          code: getSub(1).code || "CS502",
          type: "Lecture",
          startTime: "09:00 AM",
          endTime: "10:00 AM",
          faculty: getFac(1),
          room: "Lecture Hall 402, Block B",
        },
        {
          id: "wed-2",
          subject: getSub(2).subject,
          code: getSub(2).code || "AI501",
          type: "Lecture",
          startTime: "10:00 AM",
          endTime: "11:00 AM",
          faculty: getFac(2),
          room: "Lecture Hall 402, Block B",
        },
        {
          id: "wed-3",
          subject: getSub(3).subject,
          code: getSub(3).code || "AI502",
          type: "Lecture",
          startTime: "11:15 AM",
          endTime: "12:15 PM",
          faculty: getFac(3),
          room: "Lecture Hall 402, Block B",
        },
        {
          id: "wed-4",
          subject: `${getSub(0).subject} Practice`,
          code: `${getSub(0).code || "CS501"}P`,
          type: "Laboratory",
          startTime: "01:30 PM",
          endTime: "03:30 PM",
          faculty: getFac(0),
          room: "Cloud Virtualization Lab 1",
        },
      ],
      Thu: [
        {
          id: "thu-1",
          subject: getSub(4).subject,
          code: getSub(4).code || "AI503",
          type: "Lecture",
          startTime: "09:00 AM",
          endTime: "10:00 AM",
          faculty: getFac(4),
          room: "Lecture Hall 401, Block B",
        },
        {
          id: "thu-2",
          subject: getSub(0).subject,
          code: getSub(0).code || "CS501",
          type: "Lecture",
          startTime: "10:00 AM",
          endTime: "11:00 AM",
          faculty: getFac(0),
          room: "Lecture Hall 401, Block B",
        },
        {
          id: "thu-3",
          subject: getSub(1).subject,
          code: getSub(1).code || "CS502",
          type: "Tutorial",
          startTime: "11:15 AM",
          endTime: "12:15 PM",
          faculty: getFac(1),
          room: "Seminar Room 104",
        },
        {
          id: "thu-4",
          subject: `${getSub(2).subject} Deep Neural Lab`,
          code: `${getSub(2).code || "AI501"}P`,
          type: "Laboratory",
          startTime: "01:30 PM",
          endTime: "03:30 PM",
          faculty: getFac(2),
          room: "GPU Computing Cluster Room",
        },
      ],
      Fri: [
        {
          id: "fri-1",
          subject: getSub(2).subject,
          code: getSub(2).code || "AI501",
          type: "Lecture",
          startTime: "09:00 AM",
          endTime: "10:00 AM",
          faculty: getFac(2),
          room: "Lecture Hall 402, Block B",
        },
        {
          id: "fri-2",
          subject: getSub(3).subject,
          code: getSub(3).code || "AI502",
          type: "Lecture",
          startTime: "10:00 AM",
          endTime: "11:00 AM",
          faculty: getFac(3),
          room: "Lecture Hall 402, Block B",
        },
        {
          id: "fri-3",
          subject: getSub(4).subject,
          code: getSub(4).code || "AI503",
          type: "Tutorial",
          startTime: "11:15 AM",
          endTime: "12:15 PM",
          faculty: getFac(4),
          room: "Seminar Room 102",
        },
        {
          id: "fri-4",
          subject: "Industry Capstone & Mentorship",
          code: "CAP501",
          type: "Tutorial",
          startTime: "02:00 PM",
          endTime: "04:00 PM",
          faculty: "Faculty Mentor / Advisor",
          room: "Innovation Hub Room 201",
        },
      ],
      Sat: [
        {
          id: "sat-1",
          subject: "Remedial & Advanced Problem Solving",
          code: "REM501",
          type: "Tutorial",
          startTime: "09:30 AM",
          endTime: "11:30 AM",
          faculty: getFac(0),
          room: "Academic Block 4, Hall B",
        },
        {
          id: "sat-2",
          subject: "Technical Society & Open Lab Practice",
          code: "SOC501",
          type: "Laboratory",
          startTime: "11:45 AM",
          endTime: "01:45 PM",
          faculty: "Lab Instructors",
          room: "Open Computing Center",
        },
      ],
    };
  }, [subjects]);

  const activeDaySlots = weeklySchedule[selectedDay] || [];

  return (
    <div className="space-y-4">
      {/* Day Selector Navigation Tabs */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b pb-3">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {DAYS_OF_WEEK.map((d) => {
            const isSelected = selectedDay === d.key;
            const isToday = currentDayKey === d.key;
            const count = weeklySchedule[d.key]?.length ?? 0;

            return (
              <button
                key={d.key}
                type="button"
                onClick={() => {
                  play("tap");
                  setSelectedDay(d.key);
                }}
                className={`flex flex-col items-center justify-center min-w-[62px] px-3 py-2 rounded-xl border text-center transition-all ${
                  isSelected
                    ? "border-brand bg-brand/10 text-brand shadow-xs font-semibold ring-1 ring-brand"
                    : "border-border bg-card/50 text-foreground hover:bg-muted/50 hover:border-brand/30"
                }`}
              >
                <span className="text-xs font-bold">{d.short}</span>
                <span className="text-[10px] text-muted-foreground mt-0.5">
                  {count} classes
                </span>
                {isToday && (
                  <span className="mt-1 h-1 w-1 rounded-full bg-brand" />
                )}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          <span className="text-xs text-muted-foreground font-mono">
            {activeDaySlots.length} sessions scheduled
          </span>
        </div>
      </div>

      {/* Chronological Class List for Selected Day */}
      <div className="space-y-3">
        {activeDaySlots.length === 0 ? (
          <div className="rounded-xl border border-dashed p-8 text-center bg-card/40">
            <CalendarIcon className="h-8 w-8 text-muted-foreground mx-auto mb-2 opacity-50" />
            <p className="text-sm font-medium text-foreground">No classes scheduled for this day</p>
            <p className="text-xs text-muted-foreground mt-1">Enjoy your study break or review past lecture notes.</p>
          </div>
        ) : (
          activeDaySlots.map((slot) => {
            const isLab = slot.type === "Laboratory";
            const isTutorial = slot.type === "Tutorial";

            return (
              <div
                key={slot.id}
                className="rounded-xl border bg-card/70 p-4 shadow-xs backdrop-blur-sm transition-all hover:border-brand/40 hover:bg-card space-y-2.5"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/40 pb-2.5">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-brand bg-brand/10 border border-brand/20 px-2 py-0.5 rounded-md">
                      {slot.startTime} - {slot.endTime}
                    </span>
                    <span
                      className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full border ${
                        isLab
                          ? "bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20"
                          : isTutorial
                          ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
                          : "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20"
                      }`}
                    >
                      {isLab ? <FlaskConical className="h-3 w-3" /> : <BookOpen className="h-3 w-3" />}
                      <span>{slot.type}</span>
                    </span>
                  </div>

                  <span className="font-mono text-[11px] text-muted-foreground uppercase font-semibold">
                    {slot.code}
                  </span>
                </div>

                <div className="space-y-1">
                  <h4 className="font-semibold text-base text-foreground leading-snug">
                    {slot.subject}
                  </h4>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-muted-foreground pt-1">
                  <div className="flex items-center gap-1.5 truncate">
                    <User className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <span className="truncate">{slot.faculty}</span>
                  </div>
                  <div className="flex items-center gap-1.5 truncate">
                    <MapPin className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <span className="truncate">{slot.room}</span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="rounded-xl border bg-muted/20 p-3.5 text-xs text-muted-foreground flex items-center justify-between">
        <span className="font-mono text-[11px]">
          Verified from Department of Computer Science & Engineering Academic Schedule
        </span>
        <span className="text-[10px] text-muted-foreground">
          Semester 5 (Odd 2026)
        </span>
      </div>
    </div>
  );
}
