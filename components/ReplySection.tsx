/**
 * Réponses / Questions / Échanges
 * — threads 2 niveaux, @mentions, pin, retour utile (+Impact)
 */
import { useRouter } from 'expo-router';
import {
  CornerDownRight,
  MessageCircle,
  Pin,
  PinOff,
  Send,
  ThumbsUp,
  Trash2,
} from 'lucide-react-native';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useThemeFlavor } from '../hooks/useThemeFlavor';
import { formatRelativeTime } from '../lib/formatTime';
import {
  canModerateRef,
  createReply,
  deleteReply,
  fetchReplies,
  markReplyUseful,
  pinReply,
  replySectionTitle,
  searchMentionProfiles,
  type Reply,
  type ReplyRefType,
} from '../lib/replies';
import { supabase } from '../lib/supabase';

interface Props {
  refType: ReplyRefType;
  refId: string;
  /** Force refresh key from parent */
  refreshKey?: number;
}

export default function ReplySection({ refType, refId, refreshKey = 0 }: Props) {
  const { colors } = useThemeFlavor();
  const router = useRouter();
  const [meId, setMeId] = useState<string | null>(null);
  const [canMod, setCanMod] = useState(false);
  const [replies, setReplies] = useState<Reply[]>([]);
  const [loading, setLoading] = useState(true);
  const [body, setBody] = useState('');
  const [replyTo, setReplyTo] = useState<Reply | null>(null);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [hint, setHint] = useState('');
  const [suggestions, setSuggestions] = useState<
    { id: string; username: string; full_name: string | null }[]
  >([]);

  const title = replySectionTitle(refType);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const uid = user?.id ?? null;
      setMeId(uid);
      if (uid) {
        const mod = await canModerateRef(uid, refType, refId);
        setCanMod(mod);
      }
      const tree = await fetchReplies(refType, refId, uid);
      setReplies(tree);
    } finally {
      setLoading(false);
    }
  }, [refType, refId]);

  useEffect(() => {
    load();
  }, [load, refreshKey]);

  const onChangeBody = async (text: string) => {
    setBody(text);
    const at = text.match(/@([a-zA-Z0-9_]{1,30})$/);
    if (at) {
      const list = await searchMentionProfiles(at[1]);
      setSuggestions(list);
    } else {
      setSuggestions([]);
    }
  };

  const applyMention = (username: string) => {
    const next = body.replace(/@([a-zA-Z0-9_]{0,30})$/, `@${username} `);
    setBody(next);
    setSuggestions([]);
  };

  const submit = async () => {
    if (!meId) {
      router.push('/login');
      return;
    }
    if (!body.trim()) {
      setError('Écris un message.');
      return;
    }
    setSending(true);
    setError('');
    setHint('');
    const res = await createReply({
      authorId: meId,
      refType,
      refId,
      body,
      parentId: replyTo?.id || null,
    });
    setSending(false);
    if (res.error) {
      setError(res.error);
      return;
    }
    setBody('');
    setReplyTo(null);
    setSuggestions([]);
    await load();
  };

  const onDelete = async (r: Reply) => {
    if (!meId) return;
    const res = await deleteReply(r.id, meId);
    if (res.error) setError(res.error);
    else await load();
  };

  const onPin = async (r: Reply, pin: boolean) => {
    if (!meId) return;
    const res = await pinReply({ replyId: r.id, userId: meId, pin });
    if (res.error) setError(res.error);
    else {
      if (res.pointsGranted) {
        setHint(`Épinglée · +${res.pointsGranted} Impact`);
      }
      await load();
    }
  };

  const onUseful = async (r: Reply) => {
    if (!meId) return;
    const res = await markReplyUseful({ replyId: r.id, userId: meId });
    if (res.error) setError(res.error);
    else {
      if (res.pointsGranted) {
        setHint(`Retour utile · +${res.pointsGranted} Impact`);
      }
      await load();
    }
  };

  const renderItem = (r: Reply, depth: number) => {
    const isMine = meId === r.author_id;
    const initials =
      (r.author?.full_name || '?')
        .split(' ')
        .map((n) => n[0])
        .join('')
        .slice(0, 2)
        .toUpperCase() || '?';

    return (
      <View key={r.id} style={{ marginLeft: depth > 0 ? 16 : 0 }} className="mb-3">
        <View
          style={{
            backgroundColor: depth ? colors.deep : colors.card,
            borderColor: r.pinned_at ? colors.turmeric + '66' : colors.border,
            borderWidth: r.pinned_at ? 1.5 : 1,
          }}
          className="rounded-2xl px-3 py-3 gap-2"
        >
          {r.pinned_at ? (
            <View className="flex-row items-center gap-1">
              <Pin size={11} color={colors.turmeric} />
              <Text style={{ color: colors.turmeric }} className="font-inter text-[10px] font-bold">
                Épinglée
              </Text>
            </View>
          ) : null}

          <View className="flex-row items-center gap-2">
            <Pressable
              onPress={() => r.author_id && router.push(`/profile/${r.author_id}`)}
              className="w-8 h-8 rounded-full overflow-hidden items-center justify-center"
              style={{ backgroundColor: colors.deep, borderWidth: 1, borderColor: colors.border }}
            >
              {r.author?.avatar_url ? (
                <Image
                  source={{ uri: r.author.avatar_url }}
                  style={{ width: 32, height: 32 }}
                />
              ) : (
                <Text style={{ color: colors.text }} className="font-space text-[10px] font-bold">
                  {initials}
                </Text>
              )}
            </Pressable>
            <View className="flex-1">
              <Text style={{ color: colors.text }} className="font-space text-[12px] font-bold">
                {r.author?.full_name || 'Membre'}
                {r.author?.username ? (
                  <Text style={{ color: colors.textSecondary }} className="font-inter font-normal">
                    {' '}
                    @{r.author.username}
                  </Text>
                ) : null}
              </Text>
              <Text style={{ color: colors.textSecondary }} className="font-inter text-[10px]">
                {formatRelativeTime(new Date(r.created_at).getTime())}
              </Text>
            </View>
          </View>

          <Text style={{ color: colors.text }} className="font-inter text-[13px] leading-5">
            {r.body}
          </Text>

          <View className="flex-row flex-wrap items-center gap-1 pt-1">
            {depth === 0 ? (
              <Pressable
                onPress={() => setReplyTo(r)}
                className="flex-row items-center gap-1 px-2 py-1 rounded-lg active:opacity-70"
              >
                <CornerDownRight size={13} color={colors.textSecondary} />
                <Text style={{ color: colors.textSecondary }} className="font-inter text-[11px]">
                  Répondre
                </Text>
              </Pressable>
            ) : null}

            {canMod && depth === 0 ? (
              <Pressable
                onPress={() => onPin(r, !r.pinned_at)}
                className="flex-row items-center gap-1 px-2 py-1 rounded-lg"
              >
                {r.pinned_at ? (
                  <PinOff size={13} color={colors.turmeric} />
                ) : (
                  <Pin size={13} color={colors.textSecondary} />
                )}
                <Text
                  style={{ color: r.pinned_at ? colors.turmeric : colors.textSecondary }}
                  className="font-inter text-[11px]"
                >
                  {r.pinned_at ? 'Désépingler' : 'Épingler'}
                </Text>
              </Pressable>
            ) : null}

            {canMod && !isMine ? (
              <Pressable
                onPress={() => onUseful(r)}
                className="flex-row items-center gap-1 px-2 py-1 rounded-lg"
              >
                <ThumbsUp
                  size={13}
                  color={r.useful_count > 0 ? colors.kaki : colors.textSecondary}
                />
                <Text
                  style={{
                    color: r.useful_count > 0 ? colors.kaki : colors.textSecondary,
                  }}
                  className="font-inter text-[11px]"
                >
                  Utile
                </Text>
              </Pressable>
            ) : r.useful_count > 0 ? (
              <View className="flex-row items-center gap-1 px-2 py-1">
                <ThumbsUp size={13} color={colors.kaki} />
                <Text style={{ color: colors.kaki }} className="font-inter text-[11px]">
                  Utile
                </Text>
              </View>
            ) : null}

            {isMine ? (
              <Pressable
                onPress={() => onDelete(r)}
                className="flex-row items-center gap-1 px-2 py-1 rounded-lg ml-auto"
              >
                <Trash2 size={13} color={colors.corail} />
              </Pressable>
            ) : null}
          </View>
        </View>

        {(r.children || []).map((c) => renderItem(c, depth + 1))}
      </View>
    );
  };

  const totalCount =
    replies.reduce((n, r) => n + 1 + (r.children?.length || 0), 0) || 0;

  return (
    <View
      style={{ backgroundColor: colors.card, borderColor: colors.border }}
      className="border rounded-3xl p-4 gap-3"
    >
      <View className="flex-row items-center gap-2">
        <MessageCircle size={16} color={colors.turmeric} strokeWidth={2.2} />
        <Text style={{ color: colors.text }} className="font-space text-[15px] font-bold flex-1">
          {title}
          {totalCount > 0 ? (
            <Text style={{ color: colors.textSecondary }} className="font-inter font-normal">
              {' '}
              · {totalCount}
            </Text>
          ) : null}
        </Text>
      </View>

      {error ? (
        <Text style={{ color: colors.corail }} className="font-inter text-[11px]">
          {error}
        </Text>
      ) : null}
      {hint ? (
        <Text style={{ color: colors.kaki }} className="font-inter text-[11px]">
          {hint}
        </Text>
      ) : null}

      {loading ? (
        <ActivityIndicator color={colors.turmeric} />
      ) : replies.length === 0 ? (
        <Text style={{ color: colors.textSecondary }} className="font-inter text-xs py-1">
          {refType === 'mission'
            ? 'Aucune question pour l’instant.'
            : refType === 'project'
              ? 'Aucun échange pour l’instant.'
              : 'Aucune réponse pour l’instant.'}
        </Text>
      ) : (
        <View>{replies.map((r) => renderItem(r, 0))}</View>
      )}

      {replyTo ? (
        <View
          style={{ backgroundColor: colors.deep, borderColor: colors.border }}
          className="border rounded-xl px-3 py-2 flex-row items-center gap-2"
        >
          <Text style={{ color: colors.textSecondary }} className="font-inter text-[11px] flex-1" numberOfLines={1}>
            Réponse à {replyTo.author?.full_name || '…'}
          </Text>
          <Pressable onPress={() => setReplyTo(null)}>
            <Text style={{ color: colors.turmeric }} className="font-inter text-[11px] font-bold">
              Annuler
            </Text>
          </Pressable>
        </View>
      ) : null}

      {suggestions.length > 0 ? (
        <View
          style={{ backgroundColor: colors.deep, borderColor: colors.border }}
          className="border rounded-xl overflow-hidden"
        >
          {suggestions.map((s) => (
            <Pressable
              key={s.id}
              onPress={() => applyMention(s.username)}
              className="px-3 py-2.5 border-b"
              style={{ borderBottomColor: colors.border }}
            >
              <Text style={{ color: colors.text }} className="font-inter text-[12px] font-semibold">
                @{s.username}
              </Text>
              {s.full_name ? (
                <Text style={{ color: colors.textSecondary }} className="font-inter text-[10px]">
                  {s.full_name}
                </Text>
              ) : null}
            </Pressable>
          ))}
        </View>
      ) : null}

      <View
        style={{ backgroundColor: colors.deep, borderColor: colors.border }}
        className="border rounded-2xl px-3 py-2 flex-row items-end gap-2"
      >
        <TextInput
          value={body}
          onChangeText={onChangeBody}
          placeholder={
            replyTo
              ? 'Écrire une réponse…'
              : refType === 'mission'
                ? 'Poser une question…'
                : refType === 'project'
                  ? 'Lancer un échange…'
                  : 'Écrire une réponse…'
          }
          placeholderTextColor={colors.textSecondary + '99'}
          multiline
          maxLength={2000}
          style={{
            flex: 1,
            color: colors.text,
            fontSize: 14,
            maxHeight: 100,
            paddingVertical: 8,
          }}
        />
        <Pressable
          onPress={submit}
          disabled={sending}
          className="w-10 h-10 rounded-xl items-center justify-center bg-turmeric active:opacity-90"
        >
          {sending ? (
            <ActivityIndicator size="small" color="#0D0B05" />
          ) : (
            <Send size={16} color="#0D0B05" strokeWidth={2.4} />
          )}
        </Pressable>
      </View>
    </View>
  );
}
