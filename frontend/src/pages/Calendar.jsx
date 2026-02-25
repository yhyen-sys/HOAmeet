import { useEffect, useState, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import FullCalendar from '@fullcalendar/react';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import dayGridPlugin from '@fullcalendar/daygrid';
import { motion } from 'framer-motion';
import { CheckCircle } from 'lucide-react';
import tippy from 'tippy.js';
import 'tippy.js/dist/tippy.css';
import 'tippy.js/themes/light.css';
import { fetchAPI } from '../utils/api';
import Header from '../components/Header';

export default function Calendar() {
    const { uuid } = useParams();
    const navigate = useNavigate();
    const { user, hasAdminRights } = useAuthStore();
    const calendarRef = useRef(null);

    const [selectedSlots, setSelectedSlots] = useState([]);
    const [heatmapData, setHeatmapData] = useState([]);
    const [meeting, setMeeting] = useState(null);
    const [otherMeetingsEvents, setOtherMeetingsEvents] = useState([]);

    useEffect(() => {
        const loadOtherMeetings = async () => {
            try {
                // Fetch all user's meetings
                const res = await fetchAPI('/meetings/my');
                if (res.ok) {
                    const allMeetings = await res.json();
                    const confirmed = allMeetings.filter(m =>
                        m.status === 'confirmed' &&
                        m.uuid !== uuid &&
                        m.confirmed_start && m.confirmed_end
                    );

                    const events = confirmed.map(m => ({
                        id: `conf_${m.id}`,
                        title: `🔒 ${m.title} (已排定)`,
                        start: m.confirmed_start,
                        end: m.confirmed_end,
                        backgroundColor: 'rgba(100, 116, 139, 0.4)',
                        borderColor: '#64748b',
                        editable: false,
                        classNames: ['confirmed-meeting-event']
                    }));
                    setOtherMeetingsEvents(events);
                }
            } catch (error) {
                console.error("載入其他會議失敗:", error);
            }
        };
        loadOtherMeetings();
    }, [uuid]);

    useEffect(() => {
        const loadMeeting = async () => {
            try {
                const res = await fetchAPI(`/meetings/${uuid}`);
                if (res.ok) {
                    const data = await res.json();
                    setMeeting(data);

                    // If its confirmed, we might want to show different colors or something
                    // For now, let's just use the heatmap placeholder if backend doesn't provide it yet
                    // In real scenario, heatmap would be a separate API or included
                    setHeatmapData(data.heatmap || []);
                }
            } catch (error) {
                console.error("載入會議資料失敗:", error);
            }
        };
        loadMeeting();
    }, [uuid]);

    const handleSelect = (selectInfo) => {
        // 避免跨日選取
        if (!selectInfo.allDay && selectInfo.start.getDate() !== selectInfo.end.getDate()) {
            alert("請勿跨日選取時段");
            selectInfo.view.calendar.unselect();
            return;
        }

        if (selectInfo.allDay) {
            // all-day 就會選取 8am-5pm, 不包含 12pm-1:30pm
            const dateStr = selectInfo.startStr.split('T')[0];
            const timestamp = Date.now();
            const morningSlot = {
                id: `m_${timestamp}_1`,
                start: `${dateStr}T08:00:00`,
                end: `${dateStr}T12:00:00`,
                display: 'auto',
                backgroundColor: 'rgba(16, 185, 129, 0.8)',
                borderColor: '#10b981',
                classNames: ['selectable-event']
            };
            const afternoonSlot = {
                id: `m_${timestamp}_2`,
                start: `${dateStr}T13:30:00`,
                end: `${dateStr}T17:00:00`,
                display: 'auto',
                backgroundColor: 'rgba(16, 185, 129, 0.8)',
                borderColor: '#10b981',
                classNames: ['selectable-event']
            };
            setSelectedSlots(prev => [...prev, morningSlot, afternoonSlot]);
        } else {
            const newSlot = {
                id: `m_${Date.now()}`,
                start: selectInfo.startStr,
                end: selectInfo.endStr,
                display: 'auto',
                backgroundColor: 'rgba(16, 185, 129, 0.8)',
                borderColor: '#10b981',
                classNames: ['selectable-event']
            };
            setSelectedSlots(prev => [...prev, newSlot]);
        }

        selectInfo.view.calendar.unselect();
    };

    const handleEventClick = (clickInfo) => {
        if (clickInfo.event.classNames.includes('selectable-event')) {
            // 直接取消，不再詢問
            setSelectedSlots(prev => prev.filter(s => s.id !== clickInfo.event.id));
        } else if (hasAdminRights() && clickInfo.event.extendedProps.isHeatmap) {
            // 顯示神明視角 Tooltip
            tippy(clickInfo.el, {
                content: `
          <div style="text-align:left; font-family:'Inter'">
            <strong style="color:#6366f1">目前積分: ${clickInfo.event.extendedProps.score}</strong><br>
            <span>可用人數: ${clickInfo.event.extendedProps.availableCount || 0}</span>
          </div>
        `,
                allowHTML: true,
                theme: 'light',
                interactive: true,
            }).show();
        }
    };

    const submitAvailability = async () => {
        if (selectedSlots.length === 0) {
            alert("請至少選取一個時段！");
            return;
        }

        try {
            const dbSlots = selectedSlots.map(s => ({
                start_time: new Date(s.start).toISOString().slice(0, 19).replace('T', ' '),
                end_time: new Date(s.end).toISOString().slice(0, 19).replace('T', ' ')
            }));

            const res = await fetchAPI(`/user/availability`, {
                method: 'POST',
                body: JSON.stringify({
                    meeting_uuid: uuid,
                    slots: dbSlots
                })
            });

            if (res.ok) {
                alert("✅ 時段送出成功！");
                navigate('/dashboard');
            } else {
                throw new Error("API 回傳錯誤");
            }
        } catch (err) {
            console.error(err);
            alert("送出失敗");
        }
    };

    const heatmapEvents = heatmapData.map(h => ({
        start: h.start,
        end: h.end,
        display: 'background',
        backgroundColor: h.score >= 8 ? 'rgba(99, 102, 241, 0.4)' : 'rgba(99, 102, 241, 0.1)',
        extendedProps: { isHeatmap: true, score: h.score, isTop: h.isTop, availableCount: h.availableCount }
    }));

    const allEvents = [...heatmapEvents, ...otherMeetingsEvents, ...selectedSlots];

    return (
        <div className="container mx-auto px-4 py-8 max-w-6xl z-10 relative">
            <Header
                title={<span>📅 {meeting ? meeting.title : '排程選擇'}</span>}
                description={
                    <div className="flex flex-col gap-1 mt-1">
                        <div className="text-stone-400">請選取您的空檔時段</div>
                        {meeting && (
                            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs mt-2">
                                <div className="bg-white/5 px-2 py-1 rounded border border-white/10 text-stone-300">
                                    📍 {meeting.location}
                                </div>
                                {meeting.is_online === 1 && (
                                    <div className="bg-amber-500/10 px-2 py-1 rounded border border-amber-500/20 text-amber-500">
                                        🌐 提供線上參與 {meeting.online_url && `(${meeting.online_url})`}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                }
                customRightAction={
                    <div className="flex gap-3">
                        {user && meeting && user.id === meeting.admin_id && (
                            <button
                                onClick={() => navigate(`/meetings/edit/${meeting.uuid}`)}
                                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 hover:border-white/40 font-bold text-stone-200 transition-all"
                            >
                                ✏️ 編輯會議
                            </button>
                        )}
                        {hasAdminRights() && (
                            <button
                                onClick={() => alert("✅ 已拍板此時段！")}
                                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-500 hover:opacity-90 font-bold text-white shadow-lg transition-all"
                            >
                                <CheckCircle className="w-4 h-4" /> 管理者定案
                            </button>
                        )}
                    </div>
                }
            />

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass-panel p-2 md:p-6"
            >
                <style>{`
          .fc { --fc-border-color: rgba(255,255,255,0.1); --fc-page-bg-color: transparent; }
          .fc-timegrid-slot { height: 3.5em !important; }
          .fc-theme-standard td, .fc-theme-standard th { border: 1px solid rgba(255,255,255,0.1); }
          .fc-col-header-cell-cushion { color: #f8fafc; padding: 8px !important; }
          .fc-timegrid-axis-cushion { color: #94a3b8; font-size: 0.85rem; }
          .fc-event { border: none; border-radius: 4px; }
          .fc-v-event .fc-event-main { padding: 4px; font-size: 0.8rem; }
        `}</style>

                <FullCalendar
                    ref={calendarRef}
                    plugins={[timeGridPlugin, interactionPlugin, dayGridPlugin]}
                    initialView="timeGridWeek"
                    headerToolbar={{
                        left: 'prev,next today',
                        center: 'title',
                        right: 'dayGridMonth,timeGridWeek,timeGridDay'
                    }}
                    slotMinTime="08:00:00"
                    slotMaxTime="20:00:00"
                    height="auto"
                    allDaySlot={true}
                    selectable={true}
                    selectMirror={true}
                    selectOverlap={true}
                    unselectAuto={false}
                    select={handleSelect}
                    eventClick={handleEventClick}
                    events={allEvents}
                    eventContent={(arg) => {
                        if (arg.event.extendedProps.isHeatmap && arg.event.extendedProps.isTop) {
                            return (
                                <div className="absolute top-1 left-1 right-1 bg-red-500/90 text-white text-[10px] font-bold px-1 rounded shadow-sm text-center">
                                    🔥 熱門推薦 (積分 {arg.event.extendedProps.score})
                                </div>
                            );
                        }
                    }}
                />
            </motion.div>

            <div className="mt-8 flex justify-end">
                <button
                    onClick={submitAvailability}
                    className="px-8 py-3 bg-amber-500 hover:bg-amber-600 active:scale-95 text-white font-bold rounded-xl shadow-lg shadow-amber-500/30 transition-all flex items-center gap-2"
                >
                    🚀 送出我的空檔
                </button>
            </div>
        </div>
    );
}
