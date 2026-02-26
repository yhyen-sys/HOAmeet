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
import zhTwLocale from '@fullcalendar/core/locales/zh-tw';
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

    // 2026 行政院國定假日 (全天背景事件)
    const twHolidays2026 = [
        { title: '元旦', start: '2026-01-01', end: '2026-01-02' },
        { title: '農曆春節', start: '2026-02-14', end: '2026-02-23' },
        { title: '和平紀念日連假', start: '2026-02-27', end: '2026-03-02' },
        { title: '兒童節及清明節連假', start: '2026-04-03', end: '2026-04-07' },
        { title: '勞動節', start: '2026-05-01', end: '2026-05-04' },
        { title: '端午節連假', start: '2026-06-19', end: '2026-06-22' },
        { title: '中秋節及教師節', start: '2026-09-25', end: '2026-09-29' },
        { title: '國慶日連假', start: '2026-10-09', end: '2026-10-12' },
        { title: '台灣光復節連假', start: '2026-10-24', end: '2026-10-27' },
        { title: '行憲紀念日連假', start: '2026-12-25', end: '2026-12-28' }
    ].map(h => ({
        ...h,
        display: 'background',
        backgroundColor: 'rgba(239, 68, 68, 0.1)', // red-500/10
        borderColor: 'transparent',
        classNames: ['holiday-event'],
        extendedProps: { isHoliday: true, title: h.title }
    }));

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

                    if (data.user_availability && data.user_availability.length > 0) {
                        const initSlots = [];
                        data.user_availability.forEach(ua => {
                            const ts = (data.time_slots || []).find(t => t.id === ua.slot_id);
                            if (ts) {
                                initSlots.push({
                                    id: `sug_${ts.id}`,
                                    start: ts.start_time,
                                    end: ts.end_time
                                });
                            }
                        });
                        setSelectedSlots(initSlots);
                    }
                }
            } catch (error) {
                console.error("載入會議資料失敗:", error);
            }
        };
        loadMeeting();
    }, [uuid]);

    const handleSelect = (selectInfo) => {
        if (meeting?.time_slots && meeting.time_slots.length > 0) {
            alert("發起人已設定建議時段，請直接點選日曆上的橘色區塊進行空檔回覆。");
            selectInfo.view.calendar.unselect();
            return;
        }
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
        if (clickInfo.event.extendedProps.isSuggested) {
            const slotId = clickInfo.event.id;
            const originalSlot = clickInfo.event.extendedProps.originalSlot;

            setSelectedSlots(prev => {
                const exists = prev.find(s => String(s.id) === String(slotId));
                if (exists) {
                    // 取消選取
                    return prev.filter(s => String(s.id) !== String(slotId));
                } else {
                    // 加入選取
                    return [...prev, {
                        id: String(slotId),
                        start: originalSlot.start_time,
                        end: originalSlot.end_time
                    }];
                }
            });
        } else if (clickInfo.event.classNames.includes('selectable-event')) {
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
            // 確保 start 和 end 傳送的是 Local string，而非被 new Date 轉換為 UTC
            // 如果原本是 2026-03-01T08:00:00.000Z，需要確保對齊 Node-RED 預期的格式
            const formatForDB = (val) => {
                if (typeof val === 'string') {
                    return val.replace('T', ' ').substring(0, 19);
                }
                const d = new Date(val); // fallback
                return d.toISOString().slice(0, 19).replace('T', ' ');
            };

            const dbSlots = selectedSlots.map(s => ({
                start_time: formatForDB(s.start),
                end_time: formatForDB(s.end)
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

    const suggestedEvents = (meeting?.time_slots || []).map((ts, idx) => {
        const uniqueId = ts.id != null ? String(ts.id) : String(idx);
        const slotIdStr = `sug_${uniqueId}`;
        const isSelected = selectedSlots.some(s => String(s.id) === slotIdStr);
        const fstart = (ts.start_time || '').replace(' ', 'T');
        const fend = (ts.end_time || '').replace(' ', 'T');

        return {
            id: slotIdStr,
            start: fstart,
            end: fend,
            title: isSelected ? '✅ 空檔' : '💡 建議時段',
            backgroundColor: isSelected ? 'rgba(16, 185, 129, 0.9)' : 'rgba(245, 158, 11, 0.4)', // 0.7 -> 0.4 (+30% transparent)
            borderColor: isSelected ? '#10b981' : 'rgba(245, 158, 11, 0.6)',
            textColor: isSelected ? '#ffffff' : '#fef3c7',
            classNames: ['suggested-event'],
            extendedProps: {
                isSuggested: true,
                originalSlot: ts
            }
        };
    });

    // We only include selectedSlots that are NOT suggested (i.e. custom dragged)
    const customSelectedEvents = selectedSlots.filter(s => !s.id.startsWith('sug_'));

    const allEvents = [...heatmapEvents, ...otherMeetingsEvents, ...twHolidays2026, ...suggestedEvents, ...customSelectedEvents];

    return (
        <div className="container mx-auto px-4 py-8 max-w-6xl z-10 relative">
            <Header
                title={<span>📅 {meeting ? meeting.title : '排程選擇'}</span>}
                description={
                    <div className="flex flex-col gap-1 mt-1">
                        <div className="text-stone-400">請選取您的空檔時段</div>
                        {meeting && (
                            <div className="flex flex-col gap-2">
                                {meeting.survey_progress && (
                                    <div className="flex">
                                        <div className="bg-emerald-500/10 px-2 py-1 rounded-md border border-emerald-500/20 text-emerald-400 font-bold text-xs inline-flex items-center gap-1 shadow-sm">
                                            📊 調查進度: {meeting.survey_progress.responded_count || 0} / {meeting.survey_progress.total_participants || 0} 人已回覆
                                        </div>
                                    </div>
                                )}
                                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
                                    <div className="bg-white/5 px-2 py-1 rounded border border-white/10 text-stone-300">
                                        📍 {meeting.location}
                                    </div>
                                    {meeting.is_online === 1 && (
                                        <div className="bg-amber-500/10 px-2 py-1 rounded border border-amber-500/20 text-amber-500">
                                            🌐 提供線上參與 {meeting.online_url && `(${meeting.online_url})`}
                                        </div>
                                    )}
                                </div>
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
          .fc-col-header-cell-cushion { color: #f8fafc; padding: 8px !important; text-transform: capitalize; }
          .fc-timegrid-axis-cushion { color: #94a3b8; font-size: 0.85rem; }
          .fc-event { border: none; border-radius: 4px; }
          .fc-v-event .fc-event-main { padding: 4px; font-size: 0.8rem; }
          .fc-h-event { border: 1px solid rgba(255,255,255,0.1); }
          .fc .fc-toolbar-title { font-weight: 700; color: #facc15; }
          
          .fc-h-event { border: 1px solid rgba(255,255,255,0.1); }
          .fc .fc-toolbar-title { font-weight: 700; color: #facc15; }
          
          /* 月視圖下的建議時段轉換為 Badge，移除原生背景 */
          .fc-dayGridMonth-view .suggested-event {
              background-color: transparent !important;
              border-color: transparent !important;
          }
          .fc-dayGridMonth-view .suggested-event .fc-event-main {
              padding: 0 !important;
              color: inherit !important;
          }
        `}</style>

                <FullCalendar
                    ref={calendarRef}
                    plugins={[timeGridPlugin, interactionPlugin, dayGridPlugin]}
                    locale={zhTwLocale}
                    initialView="dayGridMonth"
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
                    navLinks={true}
                    navLinkDayClick={(date, jsEvent) => {
                        const api = calendarRef.current.getApi();
                        if (api.view.type === 'dayGridMonth') {
                            api.changeView('timeGridWeek', date);
                        } else if (api.view.type === 'timeGridWeek') {
                            api.changeView('timeGridDay', date);
                        } else {
                            api.changeView('timeGridDay', date);
                        }
                    }}
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
                        if (arg.event.extendedProps.isHoliday) {
                            return (
                                <div className="text-red-400 font-bold text-xs p-1 text-center opacity-70">
                                    {arg.event.extendedProps.title}
                                </div>
                            );
                        }
                        if (arg.event.extendedProps.isSuggested && arg.view.type === 'dayGridMonth') {
                            const isSelected = arg.event.title.includes('✅');
                            return (
                                <div className={`flex items-center gap-1.5 px-1 py-0.5 mx-0.5 mb-0.5 rounded border overflow-hidden ${isSelected ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400' : 'bg-amber-500/10 border-amber-500/30 text-amber-500'}`}>
                                    <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${isSelected ? 'bg-emerald-500' : 'bg-amber-500'}`}></div>
                                    <span className="text-[10px] font-bold truncate leading-none py-0.5">
                                        {arg.timeText} {isSelected ? '空檔' : '建議'}
                                    </span>
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
