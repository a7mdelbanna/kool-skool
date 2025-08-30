import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { 
  Plus, 
  Edit2, 
  Trash2, 
  Languages,
  Volume2,
  Loader2
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
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<VocabularyItem | null>(null);
  const [isTranslating, setIsTranslating] = useState(false);
  const [formData, setFormData] = useState<Partial<VocabularyItem>>({
    english: '',
    translation: '',
    language: 'ru',
    pronunciation: ''
  });

  const supportedLanguages = translationService.getSupportedLanguages();

  const handleAddVocabulary = async () => {
    try {
      if (!formData.english) {
        toast.error('Please enter an English word or phrase');
        return;
      }

      const newItem: VocabularyItem = {
        id: Date.now().toString(),
        english: formData.english,
        translation: formData.translation || '',
        language: formData.language || 'ru',
        pronunciation: formData.pronunciation || ''
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
      
      setIsAddDialogOpen(false);
      resetForm();
      toast.success('Vocabulary item added');
    } catch (error) {
      console.error('Error adding vocabulary:', error);
      toast.error('Failed to add vocabulary item');
      setIsTranslating(false);
    }
  };

  const handleUpdateVocabulary = async () => {
    if (!editingItem) return;

    try {
      const updatedVocabulary = vocabulary.map(item =>
        item.id === editingItem.id
          ? { ...item, ...formData }
          : item
      );
      
      onVocabularyUpdate(updatedVocabulary);
      
      // Update in Firebase if detailsId exists
      if (detailsId) {
        await sessionDetailsService.updateVocabularyItem(
          detailsId,
          editingItem.id,
          formData
        );
      }
      
      setEditingItem(null);
      resetForm();
      toast.success('Vocabulary item updated');
    } catch (error) {
      console.error('Error updating vocabulary:', error);
      toast.error('Failed to update vocabulary item');
    }
  };

  const handleDeleteVocabulary = async (itemId: string) => {
    if (!confirm('Are you sure you want to delete this vocabulary item?')) return;

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
    if (!formData.english) {
      toast.error('Please enter text to translate');
      return;
    }

    setIsTranslating(true);
    try {
      const result = await translationService.translate(
        formData.english,
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

  const openEditDialog = (item: VocabularyItem) => {
    setEditingItem(item);
    setFormData({
      english: item.english,
      translation: item.translation,
      language: item.language,
      pronunciation: item.pronunciation
    });
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

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Vocabulary</h3>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Vocabulary
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Add Vocabulary Item</DialogTitle>
              <DialogDescription>
                Add a new word or phrase with translation
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="english">English Word/Phrase *</Label>
                <Input
                  id="english"
                  value={formData.english}
                  onChange={(e) => setFormData({ ...formData, english: e.target.value })}
                  placeholder="Enter word or phrase..."
                />
              </div>
              
              <div>
                <Label htmlFor="language">Target Language</Label>
                <Select
                  value={formData.language}
                  onValueChange={(value) => setFormData({ ...formData, language: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {supportedLanguages.map(lang => (
                      <SelectItem key={lang.code} value={lang.code}>
                        {getLanguageFlag(lang.code)} {lang.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="translation">Translation</Label>
                <div className="flex gap-2">
                  <Input
                    id="translation"
                    value={formData.translation}
                    onChange={(e) => setFormData({ ...formData, translation: e.target.value })}
                    placeholder="Enter translation or auto-translate..."
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleTranslate}
                    disabled={isTranslating || !formData.english}
                  >
                    {isTranslating ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Languages className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
              
              <div>
                <Label htmlFor="pronunciation">Pronunciation (optional)</Label>
                <Input
                  id="pronunciation"
                  value={formData.pronunciation}
                  onChange={(e) => setFormData({ ...formData, pronunciation: e.target.value })}
                  placeholder="Enter pronunciation guide..."
                />
              </div>
              
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsAddDialogOpen(false);
                    resetForm();
                  }}
                >
                  Cancel
                </Button>
                <Button onClick={handleAddVocabulary} disabled={isTranslating}>
                  Add Item
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {vocabulary.length === 0 ? (
        <Card className="p-8 text-center">
          <Languages className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">No vocabulary items yet</p>
          <p className="text-sm text-muted-foreground mt-1">
            Add words and phrases to help your student learn
          </p>
        </Card>
      ) : (
        <div className="grid gap-3">
          {vocabulary.map(item => (
            <Card key={item.id} className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-2xl">{getLanguageFlag(item.language)}</span>
                    <div>
                      <p className="font-medium">{item.english}</p>
                      <p className="text-sm text-muted-foreground">
                        {item.translation}
                      </p>
                      {item.pronunciation && (
                        <p className="text-xs text-muted-foreground italic">
                          [{item.pronunciation}]
                        </p>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => openEditDialog(item)}
                  >
                    <Edit2 className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteVocabulary(item.id)}
                  >
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={!!editingItem} onOpenChange={(open) => !open && setEditingItem(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Vocabulary Item</DialogTitle>
            <DialogDescription>
              Update the vocabulary details
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-english">English Word/Phrase *</Label>
              <Input
                id="edit-english"
                value={formData.english}
                onChange={(e) => setFormData({ ...formData, english: e.target.value })}
                placeholder="Enter word or phrase..."
              />
            </div>
            
            <div>
              <Label htmlFor="edit-language">Target Language</Label>
              <Select
                value={formData.language}
                onValueChange={(value) => setFormData({ ...formData, language: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {supportedLanguages.map(lang => (
                    <SelectItem key={lang.code} value={lang.code}>
                      {getLanguageFlag(lang.code)} {lang.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="edit-translation">Translation</Label>
              <div className="flex gap-2">
                <Input
                  id="edit-translation"
                  value={formData.translation}
                  onChange={(e) => setFormData({ ...formData, translation: e.target.value })}
                  placeholder="Enter translation..."
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleTranslate}
                  disabled={isTranslating || !formData.english}
                >
                  {isTranslating ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Languages className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
            
            <div>
              <Label htmlFor="edit-pronunciation">Pronunciation (optional)</Label>
              <Input
                id="edit-pronunciation"
                value={formData.pronunciation}
                onChange={(e) => setFormData({ ...formData, pronunciation: e.target.value })}
                placeholder="Enter pronunciation guide..."
              />
            </div>
            
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setEditingItem(null);
                  resetForm();
                }}
              >
                Cancel
              </Button>
              <Button onClick={handleUpdateVocabulary}>
                Update Item
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SessionVocabulary;