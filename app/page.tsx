'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { callAIAgent } from '@/lib/aiAgent'
import { cn } from '@/lib/utils'
import { IoCompassOutline, IoChatbubbleOutline, IoPeopleOutline, IoPersonOutline, IoLeafOutline, IoChatbubblesOutline, IoGameControllerOutline, IoSearchOutline, IoSendOutline, IoCloseOutline, IoCheckmarkOutline, IoSparklesOutline, IoHeartOutline, IoChevronForwardOutline, IoFlashOutline, IoHelpCircleOutline, IoBulbOutline, IoTrashOutline } from 'react-icons/io5'
import { FiEdit3, FiMountain, FiHeart, FiMessageCircle, FiX } from 'react-icons/fi'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'

// ============================================================
// Constants
// ============================================================

const BUDDY_MATCHING_AGENT_ID = '699331b725423df058acde18'
const ICEBREAKER_AGENT_ID = '699331b834e9a83c77a88a78'

const ALL_INTERESTS = [
  'Movies', 'Gaming', 'Music', 'Fitness', 'Travel',
  'Books', 'Cooking', 'Art', 'Tech', 'Sports',
  'Photography', 'Nature'
]

const MOODS = [
  { id: 'chill', label: 'Chill', Icon: IoLeafOutline },
  { id: 'adventurous', label: 'Adventurous', Icon: FiMountain },
  { id: 'deep-talk', label: 'Deep Talk', Icon: IoChatbubblesOutline },
  { id: 'fun-games', label: 'Fun & Games', Icon: IoGameControllerOutline },
]

const AVATAR_COLORS = [
  'bg-rose-400', 'bg-pink-400', 'bg-fuchsia-400', 'bg-purple-400',
  'bg-violet-400', 'bg-indigo-400', 'bg-sky-400', 'bg-teal-400',
  'bg-emerald-400', 'bg-amber-400', 'bg-orange-400', 'bg-red-400',
]

// ============================================================
// Type definitions
// ============================================================

interface UserProfile {
  name: string
  bio: string
  interests: string[]
  avatarColor: string
  createdAt: string
}

interface BuddyMatch {
  name: string
  avatar: string
  bio: string
  interests: string[]
  compatibility_score: number
  match_reason: string
  mood_alignment: string
}

interface SavedBuddy extends BuddyMatch {
  id: string
  savedAt: string
}

interface ChatMessage {
  id: string
  sender: 'user' | 'buddy'
  text: string
  timestamp: string
}

interface IcebreakerData {
  icebreaker?: {
    question?: string
    category?: string
  }
  topic_suggestion?: {
    topic?: string
    description?: string
    starter_message?: string
  }
  fun_prompt?: {
    prompt?: string
    type?: string
  }
  encouragement?: string
}

type TabId = 'discover' | 'chat' | 'buddies' | 'profile'

// ============================================================
// Sample data
// ============================================================

const SAMPLE_MATCHES: BuddyMatch[] = [
  {
    name: 'Aria Chen',
    avatar: '',
    bio: 'Creative soul who loves hiking and painting landscapes.',
    interests: ['Art', 'Nature', 'Photography', 'Travel'],
    compatibility_score: 92,
    match_reason: 'Shared love of creativity and outdoor exploration.',
    mood_alignment: 'Adventurous & deep thinker',
  },
  {
    name: 'Marcus Webb',
    avatar: '',
    bio: 'Gamer by night, fitness enthusiast by day. Always up for good banter.',
    interests: ['Gaming', 'Fitness', 'Tech', 'Music'],
    compatibility_score: 87,
    match_reason: 'Mutual passion for gaming and staying active.',
    mood_alignment: 'Fun & energetic',
  },
  {
    name: 'Lena Park',
    avatar: '',
    bio: 'Bookworm, coffee addict, and aspiring chef. Let us swap recipes!',
    interests: ['Books', 'Cooking', 'Movies', 'Music'],
    compatibility_score: 79,
    match_reason: 'Both enjoy cozy evenings with great stories and food.',
    mood_alignment: 'Chill & warm',
  },
]

const SAMPLE_ICEBREAKER: IcebreakerData = {
  icebreaker: {
    question: 'If you could master any skill overnight, what would it be and why?',
    category: 'Imagination',
  },
  topic_suggestion: {
    topic: 'Travel Bucket List',
    description: 'Share your dream destinations and hidden gems you have discovered.',
    starter_message: 'I have always wanted to visit Kyoto during cherry blossom season. What is on your travel bucket list?',
  },
  fun_prompt: {
    prompt: 'Describe your perfect weekend in exactly three words.',
    type: 'Quick Fire',
  },
  encouragement: 'You are doing great! Authentic conversations start with simple curiosity.',
}

const SAMPLE_MESSAGES: ChatMessage[] = [
  { id: 's1', sender: 'user', text: 'Hey Aria! I saw we both love photography. What do you like to shoot?', timestamp: '2026-02-16T10:30:00Z' },
  { id: 's2', sender: 'buddy', text: 'Hi there! Mostly landscapes and street photography. I find golden hour shots so rewarding. How about you?', timestamp: '2026-02-16T10:31:00Z' },
  { id: 's3', sender: 'user', text: 'Same here! I am trying to get into astrophotography lately. The night sky is incredible.', timestamp: '2026-02-16T10:32:00Z' },
  { id: 's4', sender: 'buddy', text: 'That sounds amazing! I have always wanted to try that. Any tips for a beginner?', timestamp: '2026-02-16T10:33:00Z' },
]

// ============================================================
// Helpers
// ============================================================

function uid(): string {
  return Math.random().toString(36).substring(2, 10) + Date.now().toString(36)
}

function getInitial(name: string): string {
  return (name ?? '').trim().charAt(0).toUpperCase() || '?'
}

function getAvatarColor(name: string): string {
  let hash = 0
  for (let i = 0; i < (name ?? '').length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]
}

function formatTime(iso: string): string {
  if (!iso) return ''
  try {
    const d = new Date(iso)
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  } catch {
    return ''
  }
}

function formatRelative(iso: string): string {
  if (!iso) return ''
  try {
    const d = new Date(iso)
    const now = new Date()
    const diff = now.getTime() - d.getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 1) return 'just now'
    if (mins < 60) return `${mins}m ago`
    const hrs = Math.floor(mins / 60)
    if (hrs < 24) return `${hrs}h ago`
    const days = Math.floor(hrs / 24)
    return `${days}d ago`
  } catch {
    return ''
  }
}

const BUDDY_RESPONSES = [
  'That sounds really interesting! Tell me more about it.',
  'I totally agree! I have been thinking about that too.',
  'Haha, that is a great point. What got you into that?',
  'Oh wow, I did not know that. Thanks for sharing!',
  'That is awesome! We should definitely explore that together.',
  'I love that idea. It reminds me of something similar I tried.',
  'Great question! Let me think about that for a moment...',
  'You have a really unique perspective on that. I appreciate it.',
]

function getRandomBuddyResponse(): string {
  return BUDDY_RESPONSES[Math.floor(Math.random() * BUDDY_RESPONSES.length)]
}

// ============================================================
// Inline components
// ============================================================

function GlassCard({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('backdrop-blur-[16px] bg-white/75 border border-white/[0.18] rounded-[0.875rem] shadow-md', className)}>
      {children}
    </div>
  )
}

function AvatarCircle({ name, size = 'md', colorOverride }: { name: string; size?: 'sm' | 'md' | 'lg'; colorOverride?: string }) {
  const sizeClasses = size === 'sm' ? 'w-8 h-8 text-xs' : size === 'lg' ? 'w-16 h-16 text-2xl' : 'w-11 h-11 text-base'
  const color = colorOverride ?? getAvatarColor(name)
  return (
    <div className={cn('rounded-full flex items-center justify-center text-white font-semibold shrink-0', sizeClasses, color)}>
      {getInitial(name)}
    </div>
  )
}

function formatInline(text: string) {
  const parts = text.split(/\*\*(.*?)\*\*/g)
  if (parts.length === 1) return text
  return parts.map((part, i) =>
    i % 2 === 1 ? (
      <strong key={i} className="font-semibold">{part}</strong>
    ) : (
      part
    )
  )
}

function renderMarkdown(text: string) {
  if (!text) return null
  return (
    <div className="space-y-2">
      {text.split('\n').map((line, i) => {
        if (line.startsWith('### ')) return <h4 key={i} className="font-semibold text-sm mt-3 mb-1">{line.slice(4)}</h4>
        if (line.startsWith('## ')) return <h3 key={i} className="font-semibold text-base mt-3 mb-1">{line.slice(3)}</h3>
        if (line.startsWith('# ')) return <h2 key={i} className="font-bold text-lg mt-4 mb-2">{line.slice(2)}</h2>
        if (line.startsWith('- ') || line.startsWith('* ')) return <li key={i} className="ml-4 list-disc text-sm">{formatInline(line.slice(2))}</li>
        if (/^\d+\.\s/.test(line)) return <li key={i} className="ml-4 list-decimal text-sm">{formatInline(line.replace(/^\d+\.\s/, ''))}</li>
        if (!line.trim()) return <div key={i} className="h-1" />
        return <p key={i} className="text-sm">{formatInline(line)}</p>
      })}
    </div>
  )
}

// ============================================================
// Main Page
// ============================================================

export default function Page() {
  // ----- State -----
  const [mounted, setMounted] = useState(false)
  const [hasProfile, setHasProfile] = useState(false)
  const [activeTab, setActiveTab] = useState<TabId>('discover')
  const [showSampleData, setShowSampleData] = useState(false)

  // Profile
  const [profile, setProfile] = useState<UserProfile>({
    name: '',
    bio: '',
    interests: [],
    avatarColor: AVATAR_COLORS[0],
    createdAt: '',
  })
  const [editingProfile, setEditingProfile] = useState(false)
  const [profileDraft, setProfileDraft] = useState<UserProfile>({ name: '', bio: '', interests: [], avatarColor: AVATAR_COLORS[0], createdAt: '' })
  const [profileSaveMsg, setProfileSaveMsg] = useState('')

  // Discover
  const [selectedMood, setSelectedMood] = useState('')
  const [selectedTopics, setSelectedTopics] = useState<string[]>([])
  const [matches, setMatches] = useState<BuddyMatch[]>([])
  const [matchSummary, setMatchSummary] = useState('')
  const [discoverLoading, setDiscoverLoading] = useState(false)
  const [discoverError, setDiscoverError] = useState('')

  // Chat
  const [activeBuddy, setActiveBuddy] = useState<SavedBuddy | null>(null)
  const [messages, setMessages] = useState<Record<string, ChatMessage[]>>({})
  const [chatInput, setChatInput] = useState('')
  const [buddyTyping, setBuddyTyping] = useState(false)
  const [icebreaker, setIcebreaker] = useState<IcebreakerData | null>(null)
  const [icebreakerLoading, setIcebreakerLoading] = useState(false)
  const [showIcebreaker, setShowIcebreaker] = useState(false)
  const chatEndRef = useRef<HTMLDivElement>(null)

  // Buddies
  const [buddies, setBuddies] = useState<SavedBuddy[]>([])
  const [buddySearch, setBuddySearch] = useState('')

  // Agent status
  const [activeAgentId, setActiveAgentId] = useState<string | null>(null)

  // ----- Mount & localStorage -----
  useEffect(() => {
    setMounted(true)
    try {
      const storedProfile = localStorage.getItem('buddyup_profile')
      if (storedProfile) {
        const p = JSON.parse(storedProfile) as UserProfile
        setProfile(p)
        setProfileDraft(p)
        setHasProfile(true)
      }
      const storedBuddies = localStorage.getItem('buddyup_buddies')
      if (storedBuddies) {
        setBuddies(JSON.parse(storedBuddies))
      }
      const storedMessages = localStorage.getItem('buddyup_messages')
      if (storedMessages) {
        setMessages(JSON.parse(storedMessages))
      }
    } catch {
      // ignore
    }
  }, [])

  // Persist buddies
  useEffect(() => {
    if (mounted) {
      localStorage.setItem('buddyup_buddies', JSON.stringify(buddies))
    }
  }, [buddies, mounted])

  // Persist messages
  useEffect(() => {
    if (mounted) {
      localStorage.setItem('buddyup_messages', JSON.stringify(messages))
    }
  }, [messages, mounted])

  // Scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, activeBuddy, buddyTyping])

  // ----- Profile handlers -----
  const saveProfile = useCallback((p: UserProfile) => {
    const toSave = { ...p, createdAt: p.createdAt || new Date().toISOString() }
    setProfile(toSave)
    setProfileDraft(toSave)
    localStorage.setItem('buddyup_profile', JSON.stringify(toSave))
    setHasProfile(true)
  }, [])

  const handleSetupSubmit = () => {
    if (!profileDraft.name.trim()) return
    saveProfile(profileDraft)
    setActiveTab('discover')
  }

  const handleProfileSave = () => {
    saveProfile(profileDraft)
    setEditingProfile(false)
    setProfileSaveMsg('Profile updated successfully!')
    setTimeout(() => setProfileSaveMsg(''), 3000)
  }

  // ----- Discover handlers -----
  const handleFindBuddy = async () => {
    if (showSampleData) {
      setMatches(SAMPLE_MATCHES)
      setMatchSummary('Found 3 awesome buddies who match your vibe! Each one shares at least 2 of your interests and aligns with your current mood.')
      return
    }
    if (!selectedMood) {
      setDiscoverError('Please select a mood first.')
      return
    }
    setDiscoverLoading(true)
    setDiscoverError('')
    setMatches([])
    setMatchSummary('')
    setActiveAgentId(BUDDY_MATCHING_AGENT_ID)

    const agentMessage = `Find buddy matches for user: Name: ${profile.name}, Interests: ${Array.isArray(profile.interests) ? profile.interests.join(', ') : ''}, Current Mood: ${selectedMood}, Topic Preferences: ${selectedTopics.length > 0 ? selectedTopics.join(', ') : 'any'}, Bio: ${profile.bio || 'Not provided'}`

    try {
      const result = await callAIAgent(agentMessage, BUDDY_MATCHING_AGENT_ID)
      if (result.success) {
        const data = result.response?.result
        const rawMatches = data?.matches
        if (Array.isArray(rawMatches)) {
          setMatches(rawMatches.map((m: Record<string, unknown>) => ({
            name: (m?.name as string) ?? 'Unknown',
            avatar: (m?.avatar as string) ?? '',
            bio: (m?.bio as string) ?? '',
            interests: Array.isArray(m?.interests) ? (m.interests as string[]) : [],
            compatibility_score: typeof m?.compatibility_score === 'number' ? m.compatibility_score : 0,
            match_reason: (m?.match_reason as string) ?? '',
            mood_alignment: (m?.mood_alignment as string) ?? '',
          })))
        }
        setMatchSummary((data?.summary as string) ?? '')
      } else {
        setDiscoverError(result.error ?? 'Something went wrong. Please try again.')
      }
    } catch {
      setDiscoverError('Network error. Please try again.')
    } finally {
      setDiscoverLoading(false)
      setActiveAgentId(null)
    }
  }

  // ----- Chat handlers -----
  const startChat = (buddy: BuddyMatch) => {
    const existingBuddy = buddies.find(b => b.name === buddy.name)
    let savedBuddy: SavedBuddy
    if (existingBuddy) {
      savedBuddy = existingBuddy
    } else {
      savedBuddy = { ...buddy, id: uid(), savedAt: new Date().toISOString() }
      setBuddies(prev => [...prev, savedBuddy])
    }
    setActiveBuddy(savedBuddy)
    setActiveTab('chat')
    setShowIcebreaker(false)
    setIcebreaker(null)
  }

  const sendMessage = () => {
    if (!chatInput.trim() || !activeBuddy) return
    const msg: ChatMessage = {
      id: uid(),
      sender: 'user',
      text: chatInput.trim(),
      timestamp: new Date().toISOString(),
    }
    const buddyId = activeBuddy.id
    setMessages(prev => ({
      ...prev,
      [buddyId]: [...(prev[buddyId] ?? []), msg],
    }))
    setChatInput('')

    setBuddyTyping(true)
    setTimeout(() => {
      const response: ChatMessage = {
        id: uid(),
        sender: 'buddy',
        text: getRandomBuddyResponse(),
        timestamp: new Date().toISOString(),
      }
      setMessages(prev => ({
        ...prev,
        [buddyId]: [...(prev[buddyId] ?? []), response],
      }))
      setBuddyTyping(false)
    }, 1500)
  }

  const handleGetIcebreaker = async () => {
    if (showSampleData) {
      setIcebreaker(SAMPLE_ICEBREAKER)
      setShowIcebreaker(true)
      return
    }
    if (!activeBuddy) return
    setIcebreakerLoading(true)
    setActiveAgentId(ICEBREAKER_AGENT_ID)

    const buddyMsgs = messages[activeBuddy.id] ?? []
    const lastThree = buddyMsgs.slice(-3).map(m => `${m.sender}: ${m.text}`).join('; ')
    const sharedInterests = Array.isArray(activeBuddy.interests)
      ? activeBuddy.interests.filter(i => Array.isArray(profile.interests) && profile.interests.includes(i))
      : []

    const agentMessage = `Generate conversation suggestions for a chat between ${profile.name} (interests: ${Array.isArray(profile.interests) ? profile.interests.join(', ') : 'various'}) and ${activeBuddy.name} (interests: ${Array.isArray(activeBuddy.interests) ? activeBuddy.interests.join(', ') : 'various'}). Current mood: ${selectedMood || 'casual'}. Shared interests: ${sharedInterests.length > 0 ? sharedInterests.join(', ') : 'exploring new topics'}. Recent messages: ${lastThree || 'No messages yet'}`

    try {
      const result = await callAIAgent(agentMessage, ICEBREAKER_AGENT_ID)
      if (result.success) {
        const data = result.response?.result
        setIcebreaker({
          icebreaker: {
            question: data?.icebreaker?.question ?? '',
            category: data?.icebreaker?.category ?? '',
          },
          topic_suggestion: {
            topic: data?.topic_suggestion?.topic ?? '',
            description: data?.topic_suggestion?.description ?? '',
            starter_message: data?.topic_suggestion?.starter_message ?? '',
          },
          fun_prompt: {
            prompt: data?.fun_prompt?.prompt ?? '',
            type: data?.fun_prompt?.type ?? '',
          },
          encouragement: data?.encouragement ?? '',
        })
        setShowIcebreaker(true)
      }
    } catch {
      // silently fail
    } finally {
      setIcebreakerLoading(false)
      setActiveAgentId(null)
    }
  }

  const useSuggestion = (text: string) => {
    if (text) setChatInput(text)
  }

  const removeBuddy = (buddyId: string) => {
    setBuddies(prev => prev.filter(b => b.id !== buddyId))
    if (activeBuddy?.id === buddyId) {
      setActiveBuddy(null)
      setActiveTab('buddies')
    }
    setMessages(prev => {
      const updated = { ...prev }
      delete updated[buddyId]
      return updated
    })
  }

  // ----- Sample data effect -----
  useEffect(() => {
    if (showSampleData && activeBuddy) {
      const buddyId = activeBuddy.id
      if (!(messages[buddyId]?.length)) {
        setMessages(prev => ({
          ...prev,
          [buddyId]: SAMPLE_MESSAGES,
        }))
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showSampleData, activeBuddy])

  // ----- Computed -----
  const filteredBuddies = buddies.filter(b => b.name.toLowerCase().includes(buddySearch.toLowerCase()))
  const currentBuddyMessages = activeBuddy ? (messages[activeBuddy.id] ?? []) : []
  const totalConversations = Object.keys(messages).filter(k => (messages[k]?.length ?? 0) > 0).length
  const daysActive = (() => {
    if (!profile.createdAt) return 1
    try {
      const diff = Date.now() - new Date(profile.createdAt).getTime()
      return Math.max(1, Math.ceil(diff / (1000 * 60 * 60 * 24)))
    } catch { return 1 }
  })()

  // ----- Guard: not mounted -----
  if (!mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(135deg, hsl(350 35% 97%) 0%, hsl(340 30% 95%) 35%, hsl(330 25% 96%) 70%, hsl(355 30% 97%) 100%)' }}>
        <div className="animate-pulse flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-primary/20" />
          <div className="h-4 w-32 bg-muted rounded" />
        </div>
      </div>
    )
  }

  // ============================================================
  // SCREEN: Welcome / Profile Setup
  // ============================================================

  if (!hasProfile) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'linear-gradient(135deg, hsl(350 35% 97%) 0%, hsl(340 30% 95%) 35%, hsl(330 25% 96%) 70%, hsl(355 30% 97%) 100%)' }}>
        <GlassCard className="w-full max-w-md p-8">
          <div className="text-center mb-8">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <IoHeartOutline className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">Welcome to BuddyUp</h1>
            <p className="text-sm text-muted-foreground mt-2 leading-relaxed">Create your profile and start connecting with like-minded people.</p>
          </div>

          <div className="space-y-5">
            {/* Avatar color */}
            <div>
              <Label className="text-sm font-medium mb-2 block">Choose Your Color</Label>
              <div className="flex flex-wrap gap-2">
                {AVATAR_COLORS.map(color => (
                  <button
                    key={color}
                    onClick={() => setProfileDraft(prev => ({ ...prev, avatarColor: color }))}
                    className={cn('w-8 h-8 rounded-full transition-all duration-200 flex items-center justify-center', color, profileDraft.avatarColor === color ? 'ring-2 ring-primary ring-offset-2' : 'hover:scale-110')}
                  >
                    {profileDraft.avatarColor === color && <IoCheckmarkOutline className="w-4 h-4 text-white" />}
                  </button>
                ))}
              </div>
            </div>

            {/* Name */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <Label htmlFor="setup-name" className="text-sm font-medium">Name</Label>
                <span className="text-xs text-muted-foreground">{profileDraft.name.length}/30</span>
              </div>
              <Input
                id="setup-name"
                placeholder="What should we call you?"
                maxLength={30}
                value={profileDraft.name}
                onChange={e => setProfileDraft(prev => ({ ...prev, name: e.target.value }))}
                className="bg-white/50"
              />
            </div>

            {/* Bio */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <Label htmlFor="setup-bio" className="text-sm font-medium">Bio</Label>
                <span className="text-xs text-muted-foreground">{profileDraft.bio.length}/150</span>
              </div>
              <Textarea
                id="setup-bio"
                placeholder="Tell potential buddies about yourself..."
                maxLength={150}
                rows={3}
                value={profileDraft.bio}
                onChange={e => setProfileDraft(prev => ({ ...prev, bio: e.target.value }))}
                className="bg-white/50 resize-none"
              />
            </div>

            {/* Interests */}
            <div>
              <Label className="text-sm font-medium mb-2 block">Interests (pick at least 2)</Label>
              <div className="flex flex-wrap gap-2">
                {ALL_INTERESTS.map(interest => {
                  const selected = profileDraft.interests.includes(interest)
                  return (
                    <button
                      key={interest}
                      onClick={() => {
                        setProfileDraft(prev => ({
                          ...prev,
                          interests: selected
                            ? prev.interests.filter(i => i !== interest)
                            : [...prev.interests, interest],
                        }))
                      }}
                      className={cn('px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 border', selected ? 'bg-primary text-primary-foreground border-primary' : 'bg-white/50 text-foreground border-border hover:border-primary/50')}
                    >
                      {interest}
                    </button>
                  )
                })}
              </div>
            </div>

            <Button
              onClick={handleSetupSubmit}
              disabled={!profileDraft.name.trim() || profileDraft.interests.length < 2}
              className="w-full mt-4"
              size="lg"
            >
              Get Started
              <IoChevronForwardOutline className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </GlassCard>
      </div>
    )
  }

  // ============================================================
  // Render Screens
  // ============================================================

  function renderDiscover() {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-foreground">Discover Buddies</h2>
          <p className="text-sm text-muted-foreground mt-1">Set your vibe and find your perfect match.</p>
        </div>

        {/* Mood selector */}
        <GlassCard className="p-5">
          <Label className="text-sm font-medium mb-3 block">How are you feeling?</Label>
          <div className="grid grid-cols-2 gap-2">
            {MOODS.map(mood => {
              const active = selectedMood === mood.id
              return (
                <button
                  key={mood.id}
                  onClick={() => setSelectedMood(active ? '' : mood.id)}
                  className={cn('flex items-center gap-2.5 px-4 py-3 rounded-[0.875rem] text-sm font-medium transition-all duration-200 border', active ? 'bg-primary text-primary-foreground border-primary shadow-md' : 'bg-white/50 text-foreground border-border hover:border-primary/40 hover:shadow-sm')}
                >
                  <mood.Icon className="w-5 h-5 shrink-0" />
                  <span>{mood.label}</span>
                </button>
              )
            })}
          </div>
        </GlassCard>

        {/* Topic preferences */}
        <GlassCard className="p-5">
          <Label className="text-sm font-medium mb-3 block">Topic Preferences</Label>
          <div className="flex flex-wrap gap-2">
            {(Array.isArray(profile.interests) ? profile.interests : []).map(topic => {
              const active = selectedTopics.includes(topic)
              return (
                <button
                  key={topic}
                  onClick={() => setSelectedTopics(prev => active ? prev.filter(t => t !== topic) : [...prev, topic])}
                  className={cn('px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 border', active ? 'bg-accent text-accent-foreground border-accent' : 'bg-white/50 text-foreground border-border hover:border-accent/50')}
                >
                  {topic}
                </button>
              )
            })}
          </div>
        </GlassCard>

        {/* Find button */}
        <Button onClick={handleFindBuddy} disabled={discoverLoading} className="w-full" size="lg">
          {discoverLoading ? (
            <>
              <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin mr-2" />
              Finding Buddies...
            </>
          ) : (
            <>
              <IoSparklesOutline className="w-5 h-5 mr-2" />
              Find My Buddy
            </>
          )}
        </Button>

        {/* Error */}
        {discoverError && (
          <GlassCard className="p-4 border-destructive/30">
            <p className="text-sm text-destructive">{discoverError}</p>
          </GlassCard>
        )}

        {/* Loading skeletons */}
        {discoverLoading && (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <GlassCard key={i} className="p-5">
                <div className="flex items-start gap-3">
                  <Skeleton className="w-11 h-11 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-full" />
                    <div className="flex gap-2">
                      <Skeleton className="h-5 w-16 rounded-full" />
                      <Skeleton className="h-5 w-16 rounded-full" />
                      <Skeleton className="h-5 w-16 rounded-full" />
                    </div>
                  </div>
                </div>
              </GlassCard>
            ))}
          </div>
        )}

        {/* Match summary */}
        {matchSummary && !discoverLoading && (
          <GlassCard className="p-4">
            <div className="flex items-start gap-2">
              <IoSparklesOutline className="w-4 h-4 text-primary mt-0.5 shrink-0" />
              <p className="text-sm text-muted-foreground leading-relaxed">{matchSummary}</p>
            </div>
          </GlassCard>
        )}

        {/* Match results */}
        {!discoverLoading && matches.length > 0 && (
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-muted-foreground">Your Matches</h3>
            {matches.map((match, idx) => (
              <GlassCard key={idx} className="p-5">
                <div className="flex items-start gap-3">
                  <AvatarCircle name={match.name} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <h4 className="font-semibold text-sm text-foreground truncate">{match.name}</h4>
                      <Badge variant="secondary" className="shrink-0 text-xs font-semibold bg-primary/10 text-primary border-0">
                        {match.compatibility_score}% match
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed mb-2">{match.bio}</p>
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {(Array.isArray(match.interests) ? match.interests.slice(0, 3) : []).map(interest => (
                        <Badge key={interest} variant="outline" className="text-[10px] px-2 py-0.5 font-medium">{interest}</Badge>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground italic mb-1">{match.match_reason}</p>
                    {match.mood_alignment && (
                      <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                        <IoLeafOutline className="w-3 h-3" />
                        {match.mood_alignment}
                      </p>
                    )}
                  </div>
                </div>
                <Button onClick={() => startChat(match)} size="sm" className="w-full mt-4">
                  <IoChatbubbleOutline className="w-4 h-4 mr-1.5" />
                  Start Chat
                </Button>
              </GlassCard>
            ))}
          </div>
        )}

        {/* Empty state */}
        {!discoverLoading && matches.length === 0 && !discoverError && (
          <div className="text-center py-12">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
              <IoCompassOutline className="w-8 h-8 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground">Set your vibe and find your buddy!</p>
          </div>
        )}
      </div>
    )
  }

  function renderChat() {
    if (!activeBuddy) {
      return (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
            <IoChatbubbleOutline className="w-8 h-8 text-muted-foreground" />
          </div>
          <p className="text-sm text-muted-foreground text-center">No active chat. Find a buddy or pick one from your buddies list!</p>
          <Button variant="outline" className="mt-4" onClick={() => setActiveTab('discover')}>
            <IoCompassOutline className="w-4 h-4 mr-1.5" />
            Discover Buddies
          </Button>
        </div>
      )
    }

    const sharedInterests = Array.isArray(activeBuddy.interests)
      ? activeBuddy.interests.filter(i => Array.isArray(profile.interests) && profile.interests.includes(i))
      : []

    return (
      <div className="flex flex-col" style={{ height: 'calc(100vh - 140px)' }}>
        {/* Chat header */}
        <GlassCard className="p-4 mb-3 shrink-0">
          <div className="flex items-center gap-3">
            <AvatarCircle name={activeBuddy.name} />
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-sm text-foreground truncate">{activeBuddy.name}</h3>
              {sharedInterests.length > 0 && (
                <p className="text-[10px] text-muted-foreground truncate">Shared: {sharedInterests.join(', ')}</p>
              )}
            </div>
            <Button variant="ghost" size="sm" onClick={() => { setActiveBuddy(null); setActiveTab('buddies') }} className="text-muted-foreground">
              <FiX className="w-4 h-4" />
            </Button>
          </div>
        </GlassCard>

        {/* Messages */}
        <ScrollArea className="flex-1 pr-1">
          <div className="space-y-3 pb-4 px-1">
            {currentBuddyMessages.length === 0 && (
              <div className="text-center py-12">
                <FiMessageCircle className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">Start a conversation or tap &quot;Help Me Chat&quot; for ideas!</p>
              </div>
            )}
            {currentBuddyMessages.map(msg => (
              <div key={msg.id} className={cn('flex', msg.sender === 'user' ? 'justify-end' : 'justify-start')}>
                <div className={cn('max-w-[80%] px-4 py-2.5 rounded-[0.875rem] text-sm leading-relaxed', msg.sender === 'user' ? 'bg-primary text-primary-foreground rounded-br-sm' : 'bg-secondary text-secondary-foreground rounded-bl-sm')}>
                  <p>{msg.text}</p>
                  <p className={cn('text-[10px] mt-1', msg.sender === 'user' ? 'text-primary-foreground/60' : 'text-muted-foreground')}>{formatTime(msg.timestamp)}</p>
                </div>
              </div>
            ))}
            {buddyTyping && (
              <div className="flex justify-start">
                <div className="bg-secondary text-secondary-foreground px-4 py-2.5 rounded-[0.875rem] rounded-bl-sm">
                  <div className="flex gap-1 items-center h-5">
                    <div className="w-2 h-2 rounded-full bg-muted-foreground/50 animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-2 h-2 rounded-full bg-muted-foreground/50 animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-2 h-2 rounded-full bg-muted-foreground/50 animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>
        </ScrollArea>

        {/* Icebreaker suggestions */}
        {showIcebreaker && icebreaker && (
          <GlassCard className="p-4 mb-3 shrink-0">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <IoSparklesOutline className="w-4 h-4 text-primary" />
                <span className="text-xs font-semibold text-foreground">Conversation Helpers</span>
              </div>
              <button onClick={() => setShowIcebreaker(false)} className="text-muted-foreground hover:text-foreground transition-colors">
                <IoCloseOutline className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-2">
              {icebreaker.icebreaker?.question && (
                <button
                  onClick={() => useSuggestion(icebreaker.icebreaker?.question ?? '')}
                  className="w-full text-left p-3 rounded-lg bg-primary/5 hover:bg-primary/10 transition-colors border border-primary/10"
                >
                  <div className="flex items-center gap-1.5 mb-1">
                    <IoHelpCircleOutline className="w-3.5 h-3.5 text-primary" />
                    <span className="text-[10px] font-semibold text-primary uppercase">{icebreaker.icebreaker?.category ?? 'Icebreaker'}</span>
                  </div>
                  <p className="text-xs text-foreground">{icebreaker.icebreaker.question}</p>
                </button>
              )}
              {icebreaker.topic_suggestion?.starter_message && (
                <button
                  onClick={() => useSuggestion(icebreaker.topic_suggestion?.starter_message ?? '')}
                  className="w-full text-left p-3 rounded-lg bg-accent/5 hover:bg-accent/10 transition-colors border border-accent/10"
                >
                  <div className="flex items-center gap-1.5 mb-1">
                    <IoBulbOutline className="w-3.5 h-3.5 text-accent" />
                    <span className="text-[10px] font-semibold text-accent uppercase">{icebreaker.topic_suggestion?.topic ?? 'Topic'}</span>
                  </div>
                  <p className="text-xs text-foreground">{icebreaker.topic_suggestion?.description ?? ''}</p>
                  <p className="text-[10px] text-muted-foreground mt-1 italic">&quot;{icebreaker.topic_suggestion.starter_message}&quot;</p>
                </button>
              )}
              {icebreaker.fun_prompt?.prompt && (
                <button
                  onClick={() => useSuggestion(icebreaker.fun_prompt?.prompt ?? '')}
                  className="w-full text-left p-3 rounded-lg bg-secondary hover:bg-secondary/80 transition-colors border border-border"
                >
                  <div className="flex items-center gap-1.5 mb-1">
                    <IoFlashOutline className="w-3.5 h-3.5 text-foreground" />
                    <span className="text-[10px] font-semibold text-foreground uppercase">{icebreaker.fun_prompt?.type ?? 'Fun Prompt'}</span>
                  </div>
                  <p className="text-xs text-foreground">{icebreaker.fun_prompt.prompt}</p>
                </button>
              )}
              {icebreaker.encouragement && (
                <div className="flex items-start gap-2 p-2">
                  <FiHeart className="w-3 h-3 text-primary mt-0.5 shrink-0" />
                  <p className="text-[10px] text-muted-foreground italic">{icebreaker.encouragement}</p>
                </div>
              )}
            </div>
          </GlassCard>
        )}

        {/* Input area */}
        <div className="shrink-0 flex items-center gap-2 pt-2">
          <Button variant="outline" size="sm" onClick={handleGetIcebreaker} disabled={icebreakerLoading} className="shrink-0 text-xs">
            {icebreakerLoading ? (
              <div className="w-3.5 h-3.5 border-2 border-muted-foreground/30 border-t-muted-foreground rounded-full animate-spin" />
            ) : (
              <IoSparklesOutline className="w-3.5 h-3.5" />
            )}
            <span className="ml-1 hidden sm:inline">Help Me Chat</span>
          </Button>
          <div className="flex-1 flex items-center gap-2">
            <Input
              placeholder="Type a message..."
              value={chatInput}
              onChange={e => setChatInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() } }}
              className="bg-white/50"
            />
            <Button onClick={sendMessage} disabled={!chatInput.trim()} size="sm" className="shrink-0">
              <IoSendOutline className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    )
  }

  function renderBuddies() {
    return (
      <div className="space-y-4">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-foreground">My Buddies</h2>
          <p className="text-sm text-muted-foreground mt-1">{buddies.length} {buddies.length === 1 ? 'connection' : 'connections'}</p>
        </div>

        {buddies.length > 0 && (
          <div className="relative">
            <IoSearchOutline className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search buddies..." value={buddySearch} onChange={e => setBuddySearch(e.target.value)} className="pl-9 bg-white/50" />
          </div>
        )}

        {filteredBuddies.length > 0 ? (
          <div className="space-y-2">
            {filteredBuddies.map(buddy => {
              const buddyMsgs = messages[buddy.id] ?? []
              const lastMsg = buddyMsgs.length > 0 ? buddyMsgs[buddyMsgs.length - 1] : null
              return (
                <GlassCard key={buddy.id} className="p-4">
                  <div className="flex items-center gap-3">
                    <AvatarCircle name={buddy.name} size="md" />
                    <button
                      onClick={() => { setActiveBuddy(buddy); setActiveTab('chat') }}
                      className="flex-1 min-w-0 text-left"
                    >
                      <div className="flex items-center justify-between">
                        <h4 className="font-semibold text-sm text-foreground truncate">{buddy.name}</h4>
                        {lastMsg && <span className="text-[10px] text-muted-foreground shrink-0 ml-2">{formatRelative(lastMsg.timestamp)}</span>}
                      </div>
                      <p className="text-xs text-muted-foreground truncate mt-0.5">
                        {lastMsg ? `${lastMsg.sender === 'user' ? 'You: ' : ''}${lastMsg.text}` : 'No messages yet'}
                      </p>
                    </button>
                    <button onClick={() => removeBuddy(buddy.id)} className="text-muted-foreground hover:text-destructive transition-colors p-1 shrink-0" title="Remove buddy">
                      <IoTrashOutline className="w-4 h-4" />
                    </button>
                  </div>
                </GlassCard>
              )
            })}
          </div>
        ) : buddies.length > 0 ? (
          <div className="text-center py-12">
            <IoSearchOutline className="w-8 h-8 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">No buddies matching &quot;{buddySearch}&quot;</p>
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
              <IoPeopleOutline className="w-8 h-8 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground mb-2">No buddies yet -- go discover some!</p>
            <Button variant="outline" onClick={() => setActiveTab('discover')}>
              <IoCompassOutline className="w-4 h-4 mr-1.5" />
              Discover
            </Button>
          </div>
        )}
      </div>
    )
  }

  function renderProfileScreen() {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold tracking-tight text-foreground">My Profile</h2>
          {!editingProfile && (
            <Button variant="ghost" size="sm" onClick={() => setEditingProfile(true)}>
              <FiEdit3 className="w-4 h-4 mr-1" />
              Edit
            </Button>
          )}
        </div>

        <GlassCard className="p-6">
          <div className="flex flex-col items-center text-center">
            <AvatarCircle name={profile.name} size="lg" colorOverride={profile.avatarColor} />
            {editingProfile ? (
              <div className="w-full mt-4 space-y-4 text-left">
                <div>
                  <Label className="text-sm font-medium mb-2 block">Avatar Color</Label>
                  <div className="flex flex-wrap gap-2">
                    {AVATAR_COLORS.map(color => (
                      <button key={color} onClick={() => setProfileDraft(prev => ({ ...prev, avatarColor: color }))} className={cn('w-7 h-7 rounded-full transition-all duration-200', color, profileDraft.avatarColor === color ? 'ring-2 ring-primary ring-offset-2' : 'hover:scale-110')} />
                    ))}
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <Label className="text-sm font-medium">Name</Label>
                    <span className="text-xs text-muted-foreground">{profileDraft.name.length}/30</span>
                  </div>
                  <Input value={profileDraft.name} maxLength={30} onChange={e => setProfileDraft(prev => ({ ...prev, name: e.target.value }))} className="bg-white/50" />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <Label className="text-sm font-medium">Bio</Label>
                    <span className="text-xs text-muted-foreground">{profileDraft.bio.length}/150</span>
                  </div>
                  <Textarea value={profileDraft.bio} maxLength={150} rows={3} onChange={e => setProfileDraft(prev => ({ ...prev, bio: e.target.value }))} className="bg-white/50 resize-none" />
                </div>
                <div>
                  <Label className="text-sm font-medium mb-2 block">Interests</Label>
                  <div className="flex flex-wrap gap-2">
                    {ALL_INTERESTS.map(interest => {
                      const selected = profileDraft.interests.includes(interest)
                      return (
                        <button
                          key={interest}
                          onClick={() => setProfileDraft(prev => ({ ...prev, interests: selected ? prev.interests.filter(i => i !== interest) : [...prev.interests, interest] }))}
                          className={cn('px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 border', selected ? 'bg-primary text-primary-foreground border-primary' : 'bg-white/50 text-foreground border-border hover:border-primary/50')}
                        >
                          {interest}
                        </button>
                      )
                    })}
                  </div>
                </div>
                <div className="flex gap-2 pt-2">
                  <Button onClick={handleProfileSave} className="flex-1" disabled={!profileDraft.name.trim() || profileDraft.interests.length < 2}>Save Changes</Button>
                  <Button variant="outline" onClick={() => { setProfileDraft({ ...profile }); setEditingProfile(false) }}>Cancel</Button>
                </div>
              </div>
            ) : (
              <>
                <h3 className="font-semibold text-lg text-foreground mt-3">{profile.name}</h3>
                <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{profile.bio || 'No bio yet.'}</p>
                <div className="flex flex-wrap gap-1.5 mt-3 justify-center">
                  {(Array.isArray(profile.interests) ? profile.interests : []).map(i => (
                    <Badge key={i} variant="secondary" className="text-xs font-medium">{i}</Badge>
                  ))}
                </div>
              </>
            )}
          </div>
        </GlassCard>

        {profileSaveMsg && (
          <GlassCard className="p-3 border-green-200">
            <div className="flex items-center gap-2">
              <IoCheckmarkOutline className="w-4 h-4 text-green-600 shrink-0" />
              <p className="text-sm text-green-700">{profileSaveMsg}</p>
            </div>
          </GlassCard>
        )}

        <GlassCard className="p-5">
          <h4 className="text-sm font-medium text-foreground mb-4">Your Stats</h4>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-2xl font-semibold text-primary">{buddies.length}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">Buddies</p>
            </div>
            <div>
              <p className="text-2xl font-semibold text-accent">{totalConversations}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">Chats</p>
            </div>
            <div>
              <p className="text-2xl font-semibold text-foreground">{daysActive}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">Days Active</p>
            </div>
          </div>
        </GlassCard>

        <GlassCard className="p-4">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Powered By</h4>
          <div className="space-y-2.5">
            <div className="flex items-center gap-2.5">
              <div className={cn('w-2 h-2 rounded-full shrink-0', activeAgentId === BUDDY_MATCHING_AGENT_ID ? 'bg-green-500 animate-pulse' : 'bg-muted-foreground/30')} />
              <span className="text-xs text-foreground font-medium">Buddy Matching Agent</span>
              <span className="text-[10px] text-muted-foreground ml-auto">Finds compatible matches</span>
            </div>
            <div className="flex items-center gap-2.5">
              <div className={cn('w-2 h-2 rounded-full shrink-0', activeAgentId === ICEBREAKER_AGENT_ID ? 'bg-green-500 animate-pulse' : 'bg-muted-foreground/30')} />
              <span className="text-xs text-foreground font-medium">Icebreaker Agent</span>
              <span className="text-[10px] text-muted-foreground ml-auto">Chat suggestions</span>
            </div>
          </div>
        </GlassCard>
      </div>
    )
  }

  // ============================================================
  // Tab config
  // ============================================================

  const tabs: { id: TabId; label: string; Icon: React.ComponentType<{ className?: string }> }[] = [
    { id: 'discover', label: 'Discover', Icon: IoCompassOutline },
    ...(activeBuddy ? [{ id: 'chat' as TabId, label: 'Chat', Icon: IoChatbubbleOutline }] : []),
    { id: 'buddies', label: 'Buddies', Icon: IoPeopleOutline },
    { id: 'profile', label: 'Profile', Icon: IoPersonOutline },
  ]

  // ============================================================
  // Main layout
  // ============================================================

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'linear-gradient(135deg, hsl(350 35% 97%) 0%, hsl(340 30% 95%) 35%, hsl(330 25% 96%) 70%, hsl(355 30% 97%) 100%)' }}>
      {/* Top bar */}
      <header className="shrink-0 px-5 pt-5 pb-3 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
            <IoHeartOutline className="w-5 h-5 text-primary" />
          </div>
          <h1 className="text-lg font-semibold tracking-tight text-foreground">BuddyUp</h1>
        </div>
        <div className="flex items-center gap-2">
          <Label htmlFor="sample-toggle" className="text-xs text-muted-foreground cursor-pointer">Sample Data</Label>
          <Switch
            id="sample-toggle"
            checked={showSampleData}
            onCheckedChange={(checked) => {
              setShowSampleData(checked)
              if (checked) {
                setMatches(SAMPLE_MATCHES)
                setMatchSummary('Found 3 awesome buddies who match your vibe!')
              } else {
                setMatches([])
                setMatchSummary('')
              }
            }}
          />
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 px-5 pb-24 overflow-y-auto" style={{ letterSpacing: '-0.01em', lineHeight: '1.55' }}>
        {activeTab === 'discover' && renderDiscover()}
        {activeTab === 'chat' && renderChat()}
        {activeTab === 'buddies' && renderBuddies()}
        {activeTab === 'profile' && renderProfileScreen()}
      </main>

      {/* Bottom tab navigation */}
      <nav className="fixed bottom-0 left-0 right-0 backdrop-blur-[16px] bg-white/80 border-t border-white/[0.18] shadow-[0_-4px_20px_rgba(0,0,0,0.04)] z-50">
        <div className="flex items-center justify-around py-2 px-4 max-w-lg mx-auto">
          {tabs.map(tab => {
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn('flex flex-col items-center gap-0.5 py-1.5 px-3 rounded-xl transition-all duration-200 min-w-[60px]', isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground')}
              >
                <tab.Icon className={cn('w-5 h-5', isActive ? 'text-primary' : '')} />
                <span className={cn('text-[10px] font-medium', isActive ? 'text-primary' : '')}>{tab.label}</span>
                {isActive && <div className="w-4 h-0.5 bg-primary rounded-full mt-0.5" />}
              </button>
            )
          })}
        </div>
      </nav>
    </div>
  )
}
