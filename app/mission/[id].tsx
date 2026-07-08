import { ArrowLeft, Clock, Award, CheckCircle, ShieldCheck, UserCheck, AlertTriangle } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';

// Static fallback data
const FALLBACK_MISSION = {
  title: 'Intégrer les paiements Mobile Money (MTN / Moov)',
  project: 'WapiFood',
  projectId: '11111111-1111-1111-1111-111111111111',
  reward: '+120 pts',
  duration: '7 jours',
  difficultyLabel: 'Difficile',
  difficulty: 'hard',
  description: 'Nous recherchons un développeur backend ou fullstack pour intégrer l’API de paiement MTN Mobile Money (MoMo API) et Moov Money dans notre serveur Node.js.',
  tasks: [
    'Configurer les Webhooks pour recevoir les notifications MTN / Moov.',
    'Créer les routes API d’initiation de paiement et de callback.',
    'Mettre à jour le statut de la commande en base de données.',
    'Écrire des tests unitaires pour simuler les cas d’échec.'
  ],
  skills: ['Node.js', 'API REST', 'MTN MoMo API', 'Supabase'],
  assigneeId: null,
  status: 'open'
};

export default function MissionDetailsScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  
  const [mission, setMission] = useState<any>(null);
  const [meId, setMeId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);

  // Custom premium modal alerts
  const [modalVisible, setModalVisible] = useState(false);
  const [modalTitle, setModalTitle] = useState('');
  const [modalMessage, setModalMessage] = useState('');
  const [modalType, setModalType] = useState<'success' | 'error' | 'info'>('success');

  const showModal = (title: string, message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setModalTitle(title);
    setModalMessage(message);
    setModalType(type);
    setModalVisible(true);
  };

  useEffect(() => {
    fetchMissionDetails();
  }, [id]);

  const fetchMissionDetails = async () => {
    try {
      // Get current user id
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setMeId(user.id);
      }

      const { data, error } = await supabase
        .from('missions')
        .select('*, projects(id, name)')
        .eq('id', id)
        .single();

      if (error) {
        console.error(error);
        setMission(FALLBACK_MISSION);
        return;
      }

      // Generate task list from description lines or use fallback
      let tasksList = [
        'Prendre connaissance du brief et des spécifications techniques.',
        'Développer la solution en local et faire les tests d’intégration.',
        'Soumettre le livrable et le code source sur GitHub pour validation.'
      ];
      if (data.description && data.description.includes('\n')) {
        const lines = data.description.split('\n').map((l: string) => l.trim().replace(/^-\s*/, '')).filter((l: string) => l.length > 5);
        if (lines.length > 1) {
          tasksList = lines;
        }
      }

      setMission({
        id: data.id,
        title: data.title,
        project: (data.projects as any)?.name || 'Projet',
        projectId: (data.projects as any)?.id || '',
        reward: `+${data.points_reward} pts`,
        duration: '5 jours',
        difficultyLabel: data.difficulty === 'hard' ? 'Difficile' : data.difficulty === 'medium' ? 'Moyen' : 'Facile',
        difficulty: data.difficulty,
        description: data.description || 'Aucune description fournie.',
        tasks: tasksList,
        skills: data.skills_required || [],
        assigneeId: data.assignee_id,
        status: data.status
      });

    } catch (err) {
      console.error(err);
      setMission(FALLBACK_MISSION);
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    router.back();
  };

  const handleProjectPress = () => {
    if (mission?.projectId) {
      router.push(`/project/${mission.projectId}`);
    }
  };

  const handleApplyMission = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        showModal("Connexion Requise", "Veuillez vous connecter pour postuler à cette mission.", "info");
        return;
      }

      setApplying(true);
      const { error } = await supabase
        .from('missions')
        .update({
          assignee_id: user.id,
          status: 'in_progress'
        })
        .eq('id', id);

      if (error) {
        showModal("Une erreur est survenue", error.message, "error");
      } else {
        // Log reputation points (+20 points)
        await supabase
          .from('reputation_logs')
          .insert({
            user_id: user.id,
            points: 20,
            reason: `A accepté la mission : ${mission.title}`
          });

        showModal(
          "Félicitations !", 
          "Vous avez accepté cette mission. Elle est désormais en cours et apparaît dans votre profil. Votre réputation augmente de +20 pts !", 
          "success"
        );
        fetchMissionDetails(); // Refresh details
      }
    } catch (err) {
      console.error(err);
    } finally {
      setApplying(false);
    }
  };

  if (loading || !mission) {
    return (
      <View className="flex-1 bg-malt-deep items-center justify-center">
        <ActivityIndicator size="large" color="#FFBE0B" />
      </View>
    );
  }

  // Difficulty colors
  let difficultyClass = 'text-kaki bg-kaki/15 border-kaki/30';
  if (mission.difficulty === 'medium') {
    difficultyClass = 'text-turmeric bg-turmeric/10 border-turmeric/20';
  } else if (mission.difficulty === 'hard') {
    difficultyClass = 'text-corail bg-corail/15 border-corail/30';
  }

  // CTA State details
  const isAssignedToMe = mission.assigneeId === meId;
  const isAssignedToOther = mission.assigneeId && mission.assigneeId !== meId;

  return (
    <SafeAreaView className="flex-1 bg-malt-deep">
      {/* custom Header */}
      <View className="h-14 flex-row items-center justify-between px-6 bg-malt-nav border-b border-malt">
        <Pressable onPress={handleBack} className="w-9 h-9 rounded-full bg-malt-card border border-malt items-center justify-center">
          <ArrowLeft size={18} color="#F5EDD6" />
        </Pressable>
        <Text className="text-creme font-space text-base font-bold">Fiche Mission</Text>
        <View className="w-9 h-9" />
      </View>

      <ScrollView 
        className="flex-1"
        contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Mission Header */}
        <View className="gap-3 mb-6">
          <View className="flex-row justify-between items-start">
            <Pressable onPress={handleProjectPress} className="max-w-[70%]">
              <Text className="text-sable font-inter text-xs font-semibold uppercase tracking-wider mb-1 underline">
                Projet : {mission.project}
              </Text>
            </Pressable>
            <View className={`px-2.5 py-0.5 rounded-lg border ${difficultyClass}`}>
              <Text className="font-inter text-[10px] font-semibold">
                {mission.difficultyLabel}
              </Text>
            </View>
          </View>

          <Text className="text-creme font-space text-xl font-bold leading-7">
            {mission.title}
          </Text>
        </View>

        {/* Stats Rewards Card */}
        <View className="flex-row gap-4 mb-6">
          {/* Points */}
          <View className="flex-1 bg-malt-card border border-malt rounded-3xl p-5 gap-3">
            <View className="flex-row justify-between items-center">
              <Text className="text-sable font-inter text-[10px] font-bold uppercase tracking-wider">Récompense</Text>
              <Award size={14} color="#FFBE0B" />
            </View>
            <Text className="text-creme font-space text-2xl font-bold">{mission.reward}</Text>
          </View>

          {/* Duration */}
          <View className="flex-1 bg-malt-card border border-malt rounded-3xl p-5 gap-3">
            <View className="flex-row justify-between items-center">
              <Text className="text-sable font-inter text-[10px] font-bold uppercase tracking-wider">Durée estimée</Text>
              <Clock size={14} color="#A39171" />
            </View>
            <Text className="text-creme font-space text-2xl font-bold">{mission.duration}</Text>
          </View>
        </View>

        {/* Required Skills */}
        {mission.skills.length > 0 && (
          <View className="bg-malt-card border border-malt rounded-3xl p-5 gap-3 mb-6">
            <Text className="text-creme font-space text-[15px] font-bold">Compétences requises</Text>
            <View className="flex-row flex-wrap gap-1.5">
              {mission.skills.map((skill: string) => (
                <View key={skill} className="bg-malt-deep px-3 py-1.5 rounded-xl border border-malt">
                  <Text className="text-creme font-inter text-xs font-medium">{skill}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Mission Description */}
        <View className="bg-malt-card border border-malt rounded-3xl p-5 gap-3 mb-6">
          <Text className="text-creme font-space text-[15px] font-bold">Description de la mission</Text>
          <Text className="text-sable font-inter text-sm leading-6">
            {mission.description}
          </Text>
        </View>

        {/* Tasks List */}
        <View className="bg-malt-card border border-malt rounded-3xl p-5 gap-4 mb-6">
          <Text className="text-creme font-space text-[15px] font-bold">Tâches à réaliser</Text>
          <View className="gap-3">
            {mission.tasks.map((task: string, index: number) => (
              <View key={index} className="flex-row items-start gap-2.5">
                <CheckCircle size={14} color="#7CB87A" style={{ marginTop: 2 }} />
                <Text className="flex-1 text-sable font-inter text-sm leading-5">
                  {task}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* Apply CTA */}
        {isAssignedToMe ? (
          <View className="bg-kaki/15 border border-kaki/30 h-14 rounded-2xl flex-row justify-center items-center gap-2 mt-2">
            <UserCheck size={18} color="#7CB87A" strokeWidth={2.5} />
            <Text className="text-kaki font-inter-bold text-base font-bold">
              Mission acceptée (En cours)
            </Text>
          </View>
        ) : isAssignedToOther ? (
          <View className="bg-malt-card border border-malt h-14 rounded-2xl flex-row justify-center items-center gap-2 mt-2 opacity-50">
            <UserCheck size={18} color="#A39171" strokeWidth={2.5} />
            <Text className="text-sable font-inter-bold text-base font-bold">
              Mission déjà attribuée
            </Text>
          </View>
        ) : (
          <Pressable 
            onPress={handleApplyMission}
            disabled={applying}
            className="bg-turmeric h-14 rounded-2xl flex-row justify-center items-center gap-2 active:opacity-90 mt-2"
          >
            {applying ? (
              <ActivityIndicator size="small" color="#0D0B05" />
            ) : (
              <>
                <ShieldCheck size={18} color="#0D0B05" strokeWidth={2.5} />
                <Text className="text-malt-deep font-inter-bold text-base font-bold">
                  Accepter cette mission
                </Text>
              </>
            )}
          </Pressable>
        )}

      </ScrollView>

      {/* Custom Alert Modal */}
      {modalVisible && (
        <View className="absolute inset-0 bg-black/70 items-center justify-center z-50 px-6">
          <View className="bg-malt-card border border-malt p-6 rounded-3xl w-full max-w-sm gap-4 items-center">
            {modalType === 'success' ? (
              <View className="w-12 h-12 rounded-full bg-kaki/15 border border-kaki/30 items-center justify-center">
                <CheckCircle size={24} color="#7CB87A" />
              </View>
            ) : (
              <View className="w-12 h-12 rounded-full bg-turmeric/10 border border-turmeric/30 items-center justify-center">
                <AlertTriangle size={24} color="#FFBE0B" />
              </View>
            )}
            
            <View className="items-center gap-1.5 w-full">
              <Text className="text-creme font-space text-lg font-bold text-center">{modalTitle}</Text>
              <Text className="text-sable font-inter text-xs text-center leading-5">{modalMessage}</Text>
            </View>
            
            <Pressable 
              onPress={() => setModalVisible(false)}
              className="bg-turmeric w-full py-3 rounded-xl items-center justify-center active:opacity-90 mt-2"
            >
              <Text className="text-malt-deep font-inter-bold text-sm font-bold">Compris</Text>
            </Pressable>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}
