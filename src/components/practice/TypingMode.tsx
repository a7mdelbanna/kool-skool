import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { motion } from 'framer-motion';
import { Volume2, SkipForward, Check, X, Ear, Keyboard } from 'lucide-react';

interface TypingModeProps {
  word: {
    english: string;
    translation: string;
  };
  onAnswer: (correct: boolean, responseTime: number) => void;
}

const TypingMode: React.FC<TypingModeProps> = ({ word, onAnswer }) => {
  const [userInput, setUserInput] = useState('');
  const [showHint, setShowHint] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [startTime] = useState(Date.now());
  const [playCount, setPlayCount] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Reset state for new word
    setUserInput('');
    setShowHint(false);
    setAttempts(0);
    setIsCorrect(null);
    setPlayCount(0);
    
    // Auto-play audio on mount
    playAudio();
    
    // Focus input
    setTimeout(() => {
      inputRef.current?.focus();
    }, 100);
  }, [word]);

  const playAudio = () => {
    const utterance = new SpeechSynthesisUtterance(word.english);
    utterance.lang = 'en-US';
    utterance.rate = playCount > 2 ? 0.7 : 0.9; // Slow down after multiple plays
    speechSynthesis.speak(utterance);
    setPlayCount(prev => prev + 1);
  };

  const checkAnswer = () => {
    const responseTime = Date.now() - startTime;
    const isAnswerCorrect = userInput.trim().toLowerCase() === word.english.toLowerCase();
    
    setIsCorrect(isAnswerCorrect);
    setAttempts(prev => prev + 1);
    
    if (isAnswerCorrect) {
      // Correct answer
      setTimeout(() => {
        onAnswer(true, responseTime);
      }, 1000);
    } else if (attempts >= 2) {
      // Too many attempts, show answer and move on
      setShowHint(true);
      setTimeout(() => {
        onAnswer(false, responseTime);
      }, 2000);
    } else {
      // Wrong answer, try again
      setTimeout(() => {
        setIsCorrect(null);
        setUserInput('');
        inputRef.current?.focus();
      }, 1000);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (userInput.trim() && isCorrect === null) {
      checkAnswer();
    }
  };

  const handleSkip = () => {
    const responseTime = Date.now() - startTime;
    setShowHint(true);
    setIsCorrect(false);
    setTimeout(() => {
      onAnswer(false, responseTime);
    }, 1500);
  };

  const getHintText = () => {
    if (showHint) return word.english;
    if (attempts > 0) {
      // Show partial hint after first attempt
      const length = word.english.length;
      const showChars = Math.ceil(length * 0.3);
      return word.english.substring(0, showChars) + '•'.repeat(length - showChars);
    }
    return '•'.repeat(word.english.length);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="w-full max-w-2xl mx-auto"
    >
      <Card className="overflow-hidden">
        <div className="bg-gradient-to-br from-purple-50 to-blue-50 p-2">
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Ear className="h-4 w-4" />
            Listen and type what you hear
            <Keyboard className="h-4 w-4" />
          </div>
        </div>
        
        <CardContent className="p-8">
          {/* Audio Section */}
          <div className="text-center mb-8">
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              onClick={playAudio}
              className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-primary/10 hover:bg-primary/20 transition-colors"
            >
              <Volume2 className="h-10 w-10 text-primary" />
            </motion.button>
            
            <p className="mt-4 text-sm text-muted-foreground">
              Click to play again • Played {playCount} {playCount === 1 ? 'time' : 'times'}
            </p>
            
            {/* Translation hint */}
            <div className="mt-4 p-3 bg-gray-50 rounded-lg">
              <p className="text-sm text-muted-foreground mb-1">Translation:</p>
              <p className="text-lg font-medium">{word.translation}</p>
            </div>
          </div>

          {/* Input Section */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="relative">
              <Input
                ref={inputRef}
                type="text"
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                placeholder="Type what you hear..."
                className={`
                  text-lg py-6 px-4 text-center
                  ${isCorrect === true ? 'border-green-500 bg-green-50' : ''}
                  ${isCorrect === false ? 'border-red-500 bg-red-50' : ''}
                `}
                disabled={isCorrect !== null}
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck={false}
              />
              
              {/* Feedback icons */}
              {isCorrect === true && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2"
                >
                  <Check className="h-6 w-6 text-green-500" />
                </motion.div>
              )}
              
              {isCorrect === false && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2"
                >
                  <X className="h-6 w-6 text-red-500" />
                </motion.div>
              )}
            </div>

            {/* Hint */}
            {(attempts > 0 || showHint) && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center"
              >
                <p className="text-sm text-muted-foreground mb-1">
                  {showHint ? 'Correct answer:' : 'Hint:'}
                </p>
                <p className={`font-mono text-lg ${showHint ? 'text-primary font-bold' : ''}`}>
                  {getHintText()}
                </p>
              </motion.div>
            )}

            {/* Feedback message */}
            {isCorrect === true && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center text-green-600 font-medium"
              >
                Perfect! Well done! 🎉
              </motion.p>
            )}
            
            {isCorrect === false && attempts < 3 && !showHint && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center text-orange-600"
              >
                Not quite right. Try again!
              </motion.p>
            )}

            {/* Action buttons */}
            <div className="flex justify-center gap-4">
              {isCorrect === null && (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleSkip}
                    className="gap-2"
                  >
                    <SkipForward className="h-4 w-4" />
                    Skip
                  </Button>
                  
                  <Button
                    type="submit"
                    disabled={!userInput.trim()}
                    className="gap-2 min-w-[120px]"
                  >
                    <Check className="h-4 w-4" />
                    Check
                  </Button>
                </>
              )}
            </div>
          </form>

          {/* Attempts indicator */}
          {attempts > 0 && (
            <div className="mt-6 flex justify-center gap-2">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className={`
                    w-2 h-2 rounded-full
                    ${i <= attempts ? 'bg-primary' : 'bg-gray-200'}
                  `}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default TypingMode;