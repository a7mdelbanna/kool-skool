import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { Volume2, Eye, EyeOff, ChevronRight, Check, X } from 'lucide-react';

interface FlashcardModeProps {
  word: {
    english: string;
    translation: string;
    mastery_level?: number;
  };
  onAnswer: (correct: boolean, responseTime: number) => void;
  stats: {
    streak: number;
  };
}

const FlashcardMode: React.FC<FlashcardModeProps> = ({ word, onAnswer, stats }) => {
  const [isFlipped, setIsFlipped] = useState(false);
  const [showTranslation, setShowTranslation] = useState(false);
  const [startTime] = useState(Date.now());
  const [answered, setAnswered] = useState(false);

  useEffect(() => {
    // Reset state for new word
    setIsFlipped(false);
    setShowTranslation(false);
    setAnswered(false);
  }, [word]);

  const handleAnswer = (correct: boolean) => {
    if (answered) return;
    
    const responseTime = Date.now() - startTime;
    setAnswered(true);
    
    // Show feedback animation
    setTimeout(() => {
      onAnswer(correct, responseTime);
    }, 500);
  };

  const playAudio = () => {
    const utterance = new SpeechSynthesisUtterance(word.english);
    utterance.lang = 'en-US';
    utterance.rate = 0.9;
    speechSynthesis.speak(utterance);
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ duration: 0.3 }}
      className="w-full max-w-2xl mx-auto"
    >
      <div className="relative">
        {/* Streak indicator */}
        {stats.streak > 0 && (
          <motion.div
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="absolute -top-12 left-1/2 transform -translate-x-1/2"
          >
            <div className="flex items-center gap-1 bg-orange-100 text-orange-600 px-3 py-1 rounded-full text-sm font-medium">
              🔥 {stats.streak} streak!
            </div>
          </motion.div>
        )}

        <Card className="overflow-hidden">
          <CardContent className="p-0">
            <div className="relative h-96 flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50">
              <motion.div
                animate={{ rotateY: isFlipped ? 180 : 0 }}
                transition={{ duration: 0.6 }}
                style={{ transformStyle: 'preserve-3d' }}
                className="relative w-full h-full"
              >
                {/* Front of card */}
                <div 
                  className="absolute inset-0 flex flex-col items-center justify-center p-8"
                  style={{ backfaceVisibility: 'hidden' }}
                >
                  <h2 className="text-4xl font-bold mb-4">{word.english}</h2>
                  
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={playAudio}
                    className="mb-6"
                  >
                    <Volume2 className="h-6 w-6" />
                  </Button>
                  
                  {showTranslation && (
                    <motion.p
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-xl text-muted-foreground mb-6"
                    >
                      {word.translation}
                    </motion.p>
                  )}
                  
                  {!showTranslation && !answered && (
                    <Button
                      variant="outline"
                      onClick={() => setShowTranslation(true)}
                      className="gap-2"
                    >
                      <Eye className="h-4 w-4" />
                      Show Translation
                    </Button>
                  )}
                </div>

                {/* Back of card (not used in basic flashcard, but kept for potential flip animation) */}
                <div 
                  className="absolute inset-0 flex flex-col items-center justify-center p-8"
                  style={{ 
                    backfaceVisibility: 'hidden',
                    transform: 'rotateY(180deg)'
                  }}
                >
                  <h2 className="text-4xl font-bold mb-4">{word.translation}</h2>
                  <p className="text-xl text-muted-foreground">{word.english}</p>
                </div>
              </motion.div>

              {/* Answer buttons */}
              {showTranslation && !answered && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="absolute bottom-8 left-0 right-0 flex justify-center gap-4"
                >
                  <Button
                    size="lg"
                    variant="destructive"
                    onClick={() => handleAnswer(false)}
                    className="gap-2"
                  >
                    <X className="h-5 w-5" />
                    Don't Know
                  </Button>
                  <Button
                    size="lg"
                    variant="default"
                    onClick={() => handleAnswer(true)}
                    className="gap-2"
                  >
                    <Check className="h-5 w-5" />
                    Got It!
                  </Button>
                </motion.div>
              )}

              {/* Feedback overlay */}
              {answered && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="absolute inset-0 flex items-center justify-center bg-black/20"
                >
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 300 }}
                  >
                    {answered && (
                      <div className="bg-white rounded-full p-4">
                        <ChevronRight className="h-12 w-12 text-primary" />
                      </div>
                    )}
                  </motion.div>
                </motion.div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Mastery indicator */}
        {word.mastery_level !== undefined && word.mastery_level > 0 && (
          <div className="mt-4">
            <div className="flex items-center justify-between text-sm text-muted-foreground mb-1">
              <span>Mastery Level</span>
              <span>{word.mastery_level}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-gradient-to-r from-blue-400 to-purple-500 h-2 rounded-full transition-all duration-500"
                style={{ width: `${word.mastery_level}%` }}
              />
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default FlashcardMode;