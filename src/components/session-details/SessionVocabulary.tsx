import React, { useState, useRef, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Plus, 
  Edit2, 
  Trash2, 
  Languages,
  Volume2,
  Loader2,
  Check,
  X,
  BookOpen,
  Sparkles,
  ChevronRight,
  Globe,
  Mic
} from 'lucide-react';
import { toast } from 'sonner';
import { 
  sessionDetailsService, 
  VocabularyItem 
} from '@/services/firebase/sessionDetails.service';
import { translationService } from '@/services/translation.service';

interface SessionVocabularyProps {
  detailsId?: string;
  vocabulary: VocabularyItem[];
  onVocabularyUpdate: (vocabulary: VocabularyItem[]) => void;
}

const SessionVocabulary: React.FC<SessionVocabularyProps> = ({
  detailsId,
  vocabulary,
  onVocabularyUpdate
}) => {
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [isTranslating, setIsTranslating] = useState(false);
  const [formData, setFormData] = useState<Partial<VocabularyItem>>({
    english: '',
    translation: '',
    language: 'ru',
    pronunciation: ''
  });
  const newCardRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const supportedLanguages = translationService.getSupportedLanguages();

  useEffect(() => {
    if (isAddingNew && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isAddingNew]);

  const handleAddVocabulary = async () => {
    try {
      if (!formData.english?.trim()) {
        toast.error('Please enter an English word or phrase');
        return;
      }

      const newItem: VocabularyItem = {
        id: Date.now().toString(),
        english: formData.english.trim(),
        translation: formData.translation?.trim() || '',
        language: formData.language || 'ru',
        pronunciation: formData.pronunciation?.trim() || ''
      };

      // If no translation provided, auto-translate
      if (!newItem.translation && newItem.english) {
        setIsTranslating(true);
        const result = await translationService.translate(
          newItem.english,
          newItem.language
        );
        
        if ('translatedText' in result) {
          newItem.translation = result.translatedText;
        }
        setIsTranslating(false);
      }

      const updatedVocabulary = [...vocabulary, newItem];
      onVocabularyUpdate(updatedVocabulary);
      
      // Save to Firebase if detailsId exists
      if (detailsId) {
        await sessionDetailsService.addVocabularyItem(detailsId, newItem);
      }
      
      setIsAddingNew(false);
      resetForm();
      toast.success('Vocabulary item added');
    } catch (error) {
      console.error('Error adding vocabulary:', error);
      toast.error('Failed to add vocabulary item');
      setIsTranslating(false);
    }
  };

  const handleUpdateVocabulary = async (itemId: string) => {
    try {
      const updatedVocabulary = vocabulary.map(item =>
        item.id === itemId
          ? { ...item, ...formData }
          : item
      );
      
      onVocabularyUpdate(updatedVocabulary);
      
      // Update in Firebase if detailsId exists
      if (detailsId) {
        await sessionDetailsService.updateVocabularyItem(
          detailsId,
          itemId,
          formData
        );
      }
      
      setEditingItemId(null);
      resetForm();
      toast.success('Vocabulary item updated');
    } catch (error) {
      console.error('Error updating vocabulary:', error);
      toast.error('Failed to update vocabulary item');
    }
  };

  const handleDeleteVocabulary = async (itemId: string) => {
    try {
      const updatedVocabulary = vocabulary.filter(item => item.id !== itemId);
      onVocabularyUpdate(updatedVocabulary);
      
      // Delete from Firebase if detailsId exists
      if (detailsId) {
        await sessionDetailsService.deleteVocabularyItem(detailsId, itemId);
      }
      
      toast.success('Vocabulary item deleted');
    } catch (error) {
      console.error('Error deleting vocabulary:', error);
      toast.error('Failed to delete vocabulary item');
    }
  };

  const handleTranslate = async () => {
    if (!formData.english?.trim()) {
      toast.error('Please enter text to translate');
      return;
    }

    setIsTranslating(true);
    try {
      const result = await translationService.translate(
        formData.english.trim(),
        formData.language || 'ru'
      );
      
      if ('translatedText' in result) {
        setFormData({ ...formData, translation: result.translatedText });
        toast.success('Translation completed');
      } else {
        toast.error('Translation failed');
      }
    } catch (error) {
      console.error('Translation error:', error);
      toast.error('Failed to translate');
    } finally {
      setIsTranslating(false);
    }
  };

  const resetForm = () => {
    setFormData({
      english: '',
      translation: '',
      language: 'ru',
      pronunciation: ''
    });
  };

  const startEditing = (item: VocabularyItem) => {
    setEditingItemId(item.id);
    setFormData({
      english: item.english,
      translation: item.translation,
      language: item.language,
      pronunciation: item.pronunciation
    });
  };

  const cancelEdit = () => {
    setEditingItemId(null);
    resetForm();
  };

  const cancelAdd = () => {
    setIsAddingNew(false);
    resetForm();
  };

  const getLanguageFlag = (langCode: string) => {
    const flags: Record<string, string> = {
      'ru': '🇷🇺',
      'es': '🇪🇸',
      'fr': '🇫🇷',
      'de': '🇩🇪',
      'zh': '🇨🇳',
      'ja': '🇯🇵',
      'ko': '🇰🇷',
      'ar': '🇸🇦',
      'hi': '🇮🇳',
      'pt': '🇵🇹',
      'it': '🇮🇹',
      'nl': '🇳🇱',
      'pl': '🇵🇱',
      'tr': '🇹🇷',
      'uk': '🇺🇦'
    };
    return flags[langCode] || '🌐';
  };

  const playPronunciation = (text: string, language: string) => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = language === 'ru' ? 'ru-RU' : 
                       language === 'es' ? 'es-ES' : 
                       language === 'fr' ? 'fr-FR' : 
                       language === 'de' ? 'de-DE' : 
                       language === 'zh' ? 'zh-CN' : 
                       language === 'ja' ? 'ja-JP' : 
                       'en-US';
      speechSynthesis.speak(utterance);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold">Vocabulary Builder</h3>
          {vocabulary.length > 0 && (
            <Badge variant="secondary" className="ml-2">
              {vocabulary.length} {vocabulary.length === 1 ? 'word' : 'words'}
            </Badge>
          )}
        </div>
        {!isAddingNew && (
          <Button 
            onClick={() => setIsAddingNew(true)}
            className="group"
          >
            <Plus className="h-4 w-4 mr-2 group-hover:rotate-90 transition-transform" />
            Add Word
          </Button>
        )}
      </div>

      {/* New Word Card - Inline Form */}
      {isAddingNew && (
        <Card 
          ref={newCardRef}
          className="p-6 border-2 border-dashed border-primary/30 bg-primary/5 animate-in slide-in-from-top-2"
        >
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="h-5 w-5 text-primary animate-pulse" />
              <span className="font-medium text-primary">New Vocabulary</span>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Globe className="h-3 w-3" />
                  <span>English</span>
                </div>
                <Input
                  ref={inputRef}
                  value={formData.english}
                  onChange={(e) => setFormData({ ...formData, english: e.target.value })}
                  placeholder="Enter word or phrase..."
                  className="bg-white"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && formData.english?.trim()) {
                      handleAddVocabulary();
                    }
                    if (e.key === 'Escape') {
                      cancelAdd();
                    }
                  }}
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Languages className="h-3 w-3" />
                  <span>Translation</span>
                </div>
                <div className="flex gap-2">
                  <Select
                    value={formData.language}
                    onValueChange={(value) => setFormData({ ...formData, language: value })}
                  >
                    <SelectTrigger className="w-24 bg-white">
                      <SelectValue>
                        {getLanguageFlag(formData.language || 'ru')}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {supportedLanguages.map(lang => (
                        <SelectItem key={lang.code} value={lang.code}>
                          <span className="flex items-center gap-2">
                            {getLanguageFlag(lang.code)}
                            <span className="text-xs">{lang.name}</span>
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div className="flex-1 relative">
                    <Input
                      value={formData.translation}
                      onChange={(e) => setFormData({ ...formData, translation: e.target.value })}
                      placeholder="Enter translation..."
                      className="bg-white pr-10"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-1 top-1 h-7 w-7 p-0"
                      onClick={handleTranslate}
                      disabled={isTranslating || !formData.english}
                    >
                      {isTranslating ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Languages className="h-3 w-3" />
                      )}
                    </Button>
                  </div>
                </div>
              </div>

              <div className="space-y-2 md:col-span-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Mic className="h-3 w-3" />
                  <span>Pronunciation (optional)</span>
                </div>
                <Input
                  value={formData.pronunciation}
                  onChange={(e) => setFormData({ ...formData, pronunciation: e.target.value })}
                  placeholder="e.g., pree-VYEHT (for привет)"
                  className="bg-white"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="ghost"
                onClick={cancelAdd}
                className="hover:bg-white"
              >
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
              <Button 
                onClick={handleAddVocabulary} 
                disabled={isTranslating || !formData.english?.trim()}
                className="min-w-[100px]"
              >
                {isTranslating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Translating...
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4 mr-2" />
                    Add Word
                  </>
                )}
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Empty State */}
      {vocabulary.length === 0 && !isAddingNew && (
        <Card className="p-12 text-center border-dashed">
          <div className="flex flex-col items-center">
            <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <Languages className="h-8 w-8 text-primary" />
            </div>
            <h4 className="text-lg font-medium mb-2">No vocabulary yet</h4>
            <p className="text-sm text-muted-foreground mb-6 max-w-sm">
              Start building your student's vocabulary by adding words and phrases they're learning
            </p>
            <Button onClick={() => setIsAddingNew(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add First Word
            </Button>
          </div>
        </Card>
      )}

      {/* Vocabulary Cards */}
      <div className="grid gap-3">
        {vocabulary.map((item, index) => (
          <Card 
            key={item.id} 
            className={`group transition-all hover:shadow-md animate-in fade-in slide-in-from-bottom-2 ${
              editingItemId === item.id ? 'ring-2 ring-primary' : ''
            }`}
            style={{
              animationDelay: `${index * 50}ms`
            }}
          >
            {editingItemId === item.id ? (
              // Edit Mode
              <div className="p-4 space-y-3">
                <div className="grid gap-3 md:grid-cols-2">
                  <Input
                    value={formData.english}
                    onChange={(e) => setFormData({ ...formData, english: e.target.value })}
                    placeholder="English word..."
                    autoFocus
                  />
                  <div className="flex gap-2">
                    <Select
                      value={formData.language}
                      onValueChange={(value) => setFormData({ ...formData, language: value })}
                    >
                      <SelectTrigger className="w-20">
                        <SelectValue>
                          {getLanguageFlag(formData.language || 'ru')}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {supportedLanguages.map(lang => (
                          <SelectItem key={lang.code} value={lang.code}>
                            {getLanguageFlag(lang.code)} {lang.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input
                      value={formData.translation}
                      onChange={(e) => setFormData({ ...formData, translation: e.target.value })}
                      placeholder="Translation..."
                      className="flex-1"
                    />
                  </div>
                </div>
                <Input
                  value={formData.pronunciation}
                  onChange={(e) => setFormData({ ...formData, pronunciation: e.target.value })}
                  placeholder="Pronunciation guide..."
                />
                <div className="flex justify-end gap-2">
                  <Button variant="ghost" size="sm" onClick={cancelEdit}>
                    Cancel
                  </Button>
                  <Button size="sm" onClick={() => handleUpdateVocabulary(item.id)}>
                    Save
                  </Button>
                </div>
              </div>
            ) : (
              // Display Mode
              <div className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex gap-3 flex-1">
                    <div className="text-3xl mt-1">{getLanguageFlag(item.language)}</div>
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-lg">{item.english}</p>
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        <p className="text-lg text-primary">{item.translation}</p>
                      </div>
                      {item.pronunciation && (
                        <p className="text-sm text-muted-foreground italic">
                          /{item.pronunciation}/
                        </p>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={() => playPronunciation(item.translation, item.language)}
                    >
                      <Volume2 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={() => startEditing(item)}
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 hover:text-red-500"
                      onClick={() => handleDeleteVocabulary(item.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
};

export default SessionVocabulary;