import { useEffect, useState, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import FullCalendar from '@fullcalendar/react';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import dayGridPlugin from '@fullcalendar/daygrid';
import { motion } from 'framer-motion';
import { ArrowLeft, CheckCircle } from 'lucide-react';
import tippy from 'tippy.js';
import 'tippy.js/dist/tippy.css';
import 'tippy.js/themes/light.css';
import 'tippy.js/themes/light.css';
import { fetchAPI } from '../utils/api';
import Header from '../components/Header';

export default function Calendar() {
    const { id: meetingId } = useParams();
    const navigate = useNavigate();
    const { hasAdminRights } = useAuthStore();
    const calendarRef = useRef(null);

    const [selectedSlots, setSelectedSlots] = useState([]);
    const [heatmapData, setHeatmapData] = useState([]);

    useEffect(() => {
        // 模擬呼叫 API 取得已勾選時段與熱力圖資料
        setHeatmapData([
            { start: '2026-03-02T10:00:00', end: '2026-03-02T12:00:00', score: 8, isTop: true, availableCount: 5 },
            { start: '2026-03-03T14:00:00', end: '2026-03-03T15:00:00', score: 4, isTop: false, availableCount: 2 }
        ]);
    }, [meetingId]);

    const handleSelect = (selectInfo) => {
        // 避免跨日選取
        if (selectInfo.start.getDate() !== selectInfo.end.getDate()) {
            alert("請勿跨日選取時段");
            selectInfo.view.calendar.unselect();
            return;
        }

        const newSlot = {
            id: `m_${Date.now()}`,
            start: selectInfo.startStr,
            end: selectInfo.endStr,
            display: 'auto',
            backgroundColor: 'rgba(16, 185, 129, 0.8)',
            borderColor: '#10b981',
            classNames: ['selectable-event']
        };

        setSelectedSlots([...selectedSlots, newSlot]);
        selectInfo.view.calendar.unselect();
    };

    const handleEventClick = (clickInfo) => {
        if (clickInfo.event.classNames.includes('selectable-event')) {
            if (confirm('確定要取消這個時段嗎？')) {
                setSelectedSlots(selectedSlots.filter(s => s.id !== clickInfo.event.id));
            }
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
                    meeting_id: meetingId,
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

    const allEvents = [...heatmapEvents, ...selectedSlots];

    return (
        <div className="container mx-auto px-4 py-8 max-w-6xl z-10 relative">
            <Header
                title={<span>📅 排程選擇</span>}
                description="請在下方拖曳選取您的空檔時段"
                customRightAction={
                    hasAdminRights() && (
                        <button
                            onClick={() => alert("✅ 已拍板此時段！")}
                            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-500 hover:opacity-90 font-bold text-white shadow-lg transition-all"
                        >
                            <CheckCircle className="w-4 h-4" /> 管理者定案
                        </button>
                    )
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
                        right: 'timeGridWeek,timeGridDay'
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
