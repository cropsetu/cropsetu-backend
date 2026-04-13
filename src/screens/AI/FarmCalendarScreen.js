/**
 * FarmCalendarScreen — AI-generated crop calendar with task tracking
 *
 * Tabs:
 *  - Today    : due + overdue tasks across all active calendars
 *  - Calendars: list of active calendars, create new
 *  - Create   : form to generate a new ICAR-based crop calendar
 */
import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, ActivityIndicator, StatusBar, FlatList, Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLanguage } from '../../context/LanguageContext';
import {
  getCropCalendars, getCalendarTodaysTasks, generateCropCalendar,
  updateCalendarTask, getCrops,
} from '../../services/aiApi';

const BG     = '#0A140A';
const GREEN  = '#2ECC71';
const CARD   = '#131F13';
const BORDER = 'rgba(46,204,113,0.15)';

const STATUS_CONFIG = {
  upcoming:   { color: '#9CA3AF', icon: 'time-outline' },
  pending:    { color: '#9CA3AF', icon: 'time-outline' },
  due:        { color: '#F39C12', icon: 'alert-circle-outline' },
  overdue:    { color: '#E74C3C', icon: 'warning-outline' },
  completed:  { color: '#2ECC71', icon: 'checkmark-circle-outline' },
  done:       { color: '#2ECC71', icon: 'checkmark-circle-outline' },
  skipped:    { color: '#6B7280', icon: 'close-circle-outline' },
};

function TaskCard({ task, onDone, onSkip, language }) {
  const cfg = STATUS_CONFIG[task.status] || STATUS_CONFIG.upcoming;
  const isDone = task.status === 'completed' || task.status === 'done' || task.status === 'skipped';
  // Backend uses: title, scheduledDate, description, calendar.crop
  const cropName = task.calendar?.crop || task.cropName || null;
  return (
    <View style={[S.taskCard, isDone && S.taskCardDone]}>
      <View style={[S.taskStatus, { backgroundColor: cfg.color + '20' }]}>
        <Ionicons name={cfg.icon} size={18} color={cfg.color} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[S.taskName, isDone && S.taskNameDone]}>{task.title || task.task}</Text>
        {cropName && <Text style={S.taskCrop}>{cropName}</Text>}
        {task.scheduledDate && (
          <Text style={[S.taskDate, task.status === 'overdue' && { color: '#E74C3C' }]}>
            {new Date(task.scheduledDate).toLocaleDateString()}
            {task.status === 'overdue' ? (language === 'hi' ? ' • देरी' : ' • Overdue') : ''}
          </Text>
        )}
        {task.description && <Text style={S.taskNotes} numberOfLines={2}>{task.description}</Text>}
      </View>
      {!isDone && (
        <View style={S.taskActions}>
          <TouchableOpacity style={S.doneBtn} onPress={() => onDone(task.id)}>
            <Ionicons name="checkmark" size={16} color="#0A140A" />
          </TouchableOpacity>
          <TouchableOpacity style={S.skipBtn} onPress={() => onSkip(task.id)}>
            <Ionicons name="close" size={16} color="#6B7280" />
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

function CreateCalendar({ language, onCreated, onCancel, crops }) {
  const [cropName, setCropName]     = useState('');
  const [sowingDate, setSowingDate] = useState('');
  const [season, setSeason]         = useState('kharif');
  const [cropModal, setCropModal]   = useState(false);
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState(null);

  const currentYear = new Date().getFullYear();

  const handleCreate = async () => {
    if (!cropName || !sowingDate) {
      setError(language === 'hi' ? 'फसल और बुवाई तारीख आवश्यक है' : 'Crop and sowing date are required');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const result = await generateCropCalendar({
        crop: cropName,
        season,
        sowingDate,
        fieldName: '',
      });
      onCreated(result);
    } catch (err) {
      setError(err?.response?.data?.error?.message || 'Generation failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={S.createForm}>
      <Text style={S.createTitle}>{language === 'hi' ? 'नई फसल कैलेंडर' : 'New Crop Calendar'}</Text>

      <TouchableOpacity style={S.cropSelect} onPress={() => setCropModal(true)}>
        <Ionicons name="leaf-outline" size={16} color={GREEN} />
        <Text style={[S.cropSelectTxt, cropName && { color: '#F1F1EE' }]}>
          {cropName || (language === 'hi' ? 'फसल चुनें *' : 'Select crop *')}
        </Text>
        <Ionicons name="chevron-down" size={16} color="#4A6A4A" />
      </TouchableOpacity>

      <View style={S.rowInputs}>
        {['kharif','rabi','summer'].map(s => (
          <TouchableOpacity
            key={s}
            style={[S.seasonChip, season === s && S.seasonChipActive]}
            onPress={() => setSeason(s)}
          >
            <Text style={[S.seasonChipTxt, season === s && S.seasonChipTxtActive]}>
              {language === 'hi'
                ? (s === 'kharif' ? 'खरीफ' : s === 'rabi' ? 'रबी' : 'ग्रीष्म')
                : s.charAt(0).toUpperCase() + s.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={S.fieldWrap}>
        <Text style={S.fieldLabel}>{language === 'hi' ? 'बुवाई तारीख' : 'Sowing Date'} *</Text>
        <TextInput
          style={S.input}
          placeholder="YYYY-MM-DD"
          placeholderTextColor="#4A5A4A"
          value={sowingDate}
          onChangeText={setSowingDate}
        />
      </View>

      {error ? <Text style={S.errorTxt}>{error}</Text> : null}

      <View style={S.createBtns}>
        <TouchableOpacity style={S.cancelBtn} onPress={onCancel}>
          <Text style={S.cancelTxt}>{language === 'hi' ? 'रद्द करें' : 'Cancel'}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[S.calcBtn, { flex: 1 }, loading && { opacity: 0.6 }]} onPress={handleCreate} disabled={loading}>
          {loading ? <ActivityIndicator color="#0A140A" size="small" /> : (
            <Text style={S.calcTxt}>{language === 'hi' ? 'कैलेंडर बनाएं →' : 'Create →'}</Text>
          )}
        </TouchableOpacity>
      </View>

      <Modal visible={cropModal} transparent animationType="slide">
        <View style={S.modalOverlay}>
          <View style={S.modalSheet}>
            <Text style={S.modalTitle}>{language === 'hi' ? 'फसल चुनें' : 'Select Crop'}</Text>
            <FlatList
              data={crops}
              keyExtractor={(_, i) => String(i)}
              renderItem={({ item }) => (
                <TouchableOpacity style={S.modalItem} onPress={() => { setCropName(item.name); setCropModal(false); }}>
                  <Text style={S.modalItemTxt}>{item.name}</Text>
                  {item.nameHi && <Text style={S.modalItemHi}>{item.nameHi}</Text>}
                </TouchableOpacity>
              )}
            />
            <TouchableOpacity style={S.modalClose} onPress={() => setCropModal(false)}>
              <Text style={S.modalCloseTxt}>{language === 'hi' ? 'रद्द करें' : 'Cancel'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

export default function FarmCalendarScreen({ navigation }) {
  const { language } = useLanguage();
  const [tab, setTab]           = useState('today');
  const [todayTasks, setToday]  = useState([]);
  const [calendars, setCals]    = useState([]);
  const [crops, setCrops]       = useState([]);
  const [loading, setLoading]   = useState(false);
  const [creating, setCreating] = useState(false);

  const loadTasks = useCallback(async () => {
    setLoading(true);
    try {
      // Backend returns { today: [...], overdue: [...] }
      const result = await getCalendarTodaysTasks();
      const todayArr  = result?.today   || [];
      const overdueArr = result?.overdue || [];
      // Tag overdue tasks so the card can highlight them
      const merged = [
        ...overdueArr.map(t => ({ ...t, status: 'overdue' })),
        ...todayArr.map(t => ({ ...t, status: t.status || 'due' })),
      ];
      setToday(merged);
    } catch {}
    setLoading(false);
  }, []);

  const loadCals = useCallback(async () => {
    setLoading(true);
    try {
      const cals = await getCropCalendars();
      setCals(cals);
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => {
    getCrops().then(setCrops).catch(() => {});
    if (tab === 'today')     loadTasks();
    if (tab === 'calendars') loadCals();
  }, [tab]);

  const handleDone = async (taskId) => {
    await updateCalendarTask(taskId, 'completed').catch(() => {});
    setToday(prev => prev.map(t => t.id === taskId ? { ...t, status: 'done' } : t));
  };

  const handleSkip = async (taskId) => {
    await updateCalendarTask(taskId, 'skipped').catch(() => {});
    setToday(prev => prev.map(t => t.id === taskId ? { ...t, status: 'skipped' } : t));
  };

  const TABS = [
    { key: 'today',     label: language === 'hi' ? 'आज के काम' : "Today's Tasks" },
    { key: 'calendars', label: language === 'hi' ? 'कैलेंडर'   : 'Calendars' },
    { key: 'create',    label: language === 'hi' ? 'नया बनाएं' : 'Create New' },
  ];

  return (
    <View style={S.root}>
      <StatusBar barStyle="light-content" backgroundColor={BG} />

      <View style={S.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={S.backBtn}>
          <Ionicons name="chevron-back" size={22} color={GREEN} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={S.headerTitle}>{language === 'hi' ? 'फसल कैलेंडर' : 'Farm Calendar'}</Text>
          <Text style={S.headerSub}>{language === 'hi' ? 'ICAR आधारित कार्य शेड्यूल' : 'ICAR-based task schedule'}</Text>
        </View>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={S.tabScroll} contentContainerStyle={S.tabContent}>
        {TABS.map(t => (
          <TouchableOpacity key={t.key} style={[S.tabBtn, tab === t.key && S.tabBtnActive]} onPress={() => setTab(t.key)}>
            <Text style={[S.tabTxt, tab === t.key && S.tabTxtActive]}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {tab === 'today' && (
        loading ? (
          <View style={S.centered}><ActivityIndicator color={GREEN} size="large" /></View>
        ) : (
          <FlatList
            data={todayTasks}
            keyExtractor={(_, i) => String(i)}
            renderItem={({ item }) => (
              <TaskCard task={item} language={language} onDone={handleDone} onSkip={handleSkip} />
            )}
            contentContainerStyle={S.listContent}
            ListEmptyComponent={
              <View style={S.centered}>
                <Ionicons name="calendar-outline" size={48} color="#4A6A4A" />
                <Text style={S.emptyTxt}>{language === 'hi' ? 'आज कोई काम नहीं' : 'No tasks for today'}</Text>
                <Text style={S.emptySub}>{language === 'hi' ? '"नया बनाएं" से कैलेंडर बनाएं' : 'Create a calendar from the Create tab'}</Text>
              </View>
            }
          />
        )
      )}

      {tab === 'calendars' && (
        loading ? (
          <View style={S.centered}><ActivityIndicator color={GREEN} size="large" /></View>
        ) : (
          <FlatList
            data={calendars}
            keyExtractor={(_, i) => String(i)}
            contentContainerStyle={S.listContent}
            renderItem={({ item }) => (
              <View style={S.calCard}>
                <View style={S.calIcon}>
                  <Ionicons name="leaf" size={20} color={GREEN} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={S.calCrop}>{item.crop}</Text>
                  <Text style={S.calMeta}>
                    {item.season} · {item.year}
                    {item.sowingDate ? ` · Sown ${new Date(item.sowingDate).toLocaleDateString()}` : ''}
                  </Text>
                </View>
                <View style={S.calStats}>
                  <Text style={[S.calStat, { color: GREEN }]}>{item.stats?.total || 0}</Text>
                  <Text style={S.calStatLabel}>{language === 'hi' ? 'काम' : 'tasks'}</Text>
                </View>
              </View>
            )}
            ListEmptyComponent={
              <View style={S.centered}>
                <Ionicons name="calendar-outline" size={48} color="#4A6A4A" />
                <Text style={S.emptyTxt}>{language === 'hi' ? 'कोई कैलेंडर नहीं' : 'No calendars yet'}</Text>
                <TouchableOpacity style={S.createBtnSmall} onPress={() => setTab('create')}>
                  <Text style={S.createBtnSmallTxt}>{language === 'hi' ? '+ नया बनाएं' : '+ Create New'}</Text>
                </TouchableOpacity>
              </View>
            }
          />
        )
      )}

      {tab === 'create' && (
        <ScrollView contentContainerStyle={{ padding: 18 }}>
          <CreateCalendar
            language={language}
            crops={crops}
            onCreated={(result) => {
              setTab('calendars');
              loadCals();
            }}
            onCancel={() => setTab('calendars')}
          />
        </ScrollView>
      )}
    </View>
  );
}

const S = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingTop: 52, paddingHorizontal: 18, paddingBottom: 16,
    borderBottomWidth: 1, borderBottomColor: BORDER,
  },
  backBtn: { width: 36, height: 36, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#F1F1EE' },
  headerSub:   { fontSize: 10, color: '#4A6A4A', marginTop: 1 },

  tabScroll:  { flexGrow: 0 },
  tabContent: { paddingHorizontal: 18, paddingVertical: 12, gap: 8 },
  tabBtn: {
    paddingHorizontal: 16, paddingVertical: 9, borderRadius: 10,
    borderWidth: 1, borderColor: BORDER, backgroundColor: CARD,
  },
  tabBtnActive:   { backgroundColor: GREEN, borderColor: GREEN },
  tabTxt:         { fontSize: 13, fontWeight: '700', color: '#9CA3AF' },
  tabTxtActive:   { color: '#0A140A' },

  listContent: { padding: 18, paddingBottom: 40, gap: 10 },

  taskCard: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 12,
    backgroundColor: CARD, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: BORDER,
  },
  taskCardDone: { opacity: 0.5 },
  taskStatus: { width: 36, height: 36, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  taskName:     { fontSize: 14, fontWeight: '700', color: '#F1F1EE' },
  taskNameDone: { textDecorationLine: 'line-through', color: '#6B7280' },
  taskCrop: { fontSize: 11, color: GREEN, fontWeight: '600', marginTop: 2 },
  taskDate: { fontSize: 11, color: '#4A6A4A', marginTop: 2 },
  taskNotes: { fontSize: 11, color: '#9CA3AF', marginTop: 4, lineHeight: 16 },
  taskActions: { gap: 6 },
  doneBtn: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: GREEN, justifyContent: 'center', alignItems: 'center',
  },
  skipBtn: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: 'rgba(107,114,128,0.15)', justifyContent: 'center', alignItems: 'center',
  },

  calCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: CARD, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: BORDER,
  },
  calIcon: { width: 44, height: 44, borderRadius: 12, backgroundColor: 'rgba(46,204,113,0.10)', justifyContent: 'center', alignItems: 'center' },
  calCrop: { fontSize: 15, fontWeight: '700', color: '#F1F1EE' },
  calMeta: { fontSize: 11, color: '#4A6A4A', marginTop: 2 },
  calStats: { alignItems: 'center' },
  calStat:  { fontSize: 18, fontWeight: '900' },
  calStatLabel: { fontSize: 10, color: '#4A6A4A' },

  createForm: { gap: 14 },
  createTitle: { fontSize: 18, fontWeight: '800', color: '#F1F1EE' },
  cropSelect: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: CARD, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 12,
    borderWidth: 1, borderColor: BORDER,
  },
  cropSelectTxt: { flex: 1, fontSize: 14, color: '#4A5A4A' },
  rowInputs: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  seasonChip: {
    paddingHorizontal: 14, paddingVertical: 9,
    borderRadius: 10, borderWidth: 1, borderColor: BORDER, backgroundColor: CARD,
  },
  seasonChipActive:    { backgroundColor: GREEN, borderColor: GREEN },
  seasonChipTxt:       { fontSize: 13, color: '#9CA3AF', fontWeight: '700' },
  seasonChipTxtActive: { color: '#0A140A' },
  fieldWrap: { gap: 6 },
  fieldLabel: { fontSize: 13, color: '#9CA3AF', fontWeight: '600' },
  input: {
    backgroundColor: CARD, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 12,
    borderWidth: 1, borderColor: BORDER,
    color: '#D1D5DB', fontSize: 14,
  },
  errorTxt: { fontSize: 13, color: '#EF4444' },
  createBtns: { flexDirection: 'row', gap: 10 },
  cancelBtn: {
    paddingHorizontal: 18, paddingVertical: 14,
    borderRadius: 14, borderWidth: 1, borderColor: BORDER,
    alignItems: 'center',
  },
  cancelTxt: { fontSize: 14, color: '#9CA3AF', fontWeight: '700' },
  calcBtn: {
    backgroundColor: GREEN, borderRadius: 14,
    paddingVertical: 14, alignItems: 'center',
  },
  calcTxt: { fontSize: 15, fontWeight: '800', color: '#0A140A' },

  createBtnSmall: {
    marginTop: 12, backgroundColor: GREEN, borderRadius: 10,
    paddingHorizontal: 20, paddingVertical: 10,
  },
  createBtnSmallTxt: { fontSize: 14, fontWeight: '700', color: '#0A140A' },

  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 60, gap: 12 },
  emptyTxt: { fontSize: 15, color: '#9CA3AF', fontWeight: '700', textAlign: 'center' },
  emptySub:  { fontSize: 12, color: '#4A6A4A', textAlign: 'center' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: '#1A2A1A', borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '60%', padding: 18 },
  modalTitle: { fontSize: 16, fontWeight: '800', color: '#F1F1EE', marginBottom: 14 },
  modalItem: { paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: BORDER, flexDirection: 'row', alignItems: 'center', gap: 10 },
  modalItemTxt: { fontSize: 14, color: '#D1D5DB', fontWeight: '600', flex: 1 },
  modalItemHi:  { fontSize: 13, color: '#4A6A4A' },
  modalClose: { paddingVertical: 16, alignItems: 'center', marginTop: 8 },
  modalCloseTxt: { fontSize: 14, color: '#EF4444', fontWeight: '700' },
});
