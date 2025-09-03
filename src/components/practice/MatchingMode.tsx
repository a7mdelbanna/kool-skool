import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import { Shuffle, CheckCircle, XCircle } from 'lucide-react';
import confetti from 'canvas-confetti';

interface Word {
  english: string;
  translation: string;
}

interface MatchingModeProps {
  words: Word[];
  onComplete: (results: { correct: boolean; responseTime: number }[]) => void;
}

interface MatchCard {
  id: string;
  text: string;
  type: 'english' | 'translation';
  wordIndex: number;
  isMatched: boolean;
  isSelected: boolean;
  isWrong: boolean;
}

const MatchingMode: React.FC<MatchingModeProps> = ({ words, onComplete }) => {
  const [cards, setCards] = useState<MatchCard[]>([]);
  const [selectedCards, setSelectedCards] = useState<MatchCard[]>([]);
  const [matchedPairs, setMatchedPairs] = useState<Set<number>>(new Set());
  const [attempts, setAttempts] = useState(0);
  const [startTime] = useState(Date.now());
  const [results, setResults] = useState<{ correct: boolean; responseTime: number }[]>([]);

  // Initialize cards
  useEffect(() => {
    const newCards: MatchCard[] = [];
    
    words.forEach((word, index) => {
      // English card
      newCards.push({
        id: `en-${index}`,
        text: word.english,
        type: 'english',
        wordIndex: index,
        isMatched: false,
        isSelected: false,
        isWrong: false
      });
      
      // Translation card
      newCards.push({
        id: `tr-${index}`,
        text: word.translation,
        type: 'translation',
        wordIndex: index,
        isMatched: false,
        isSelected: false,
        isWrong: false
      });
    });
    
    // Shuffle cards
    const shuffled = [...newCards].sort(() => Math.random() - 0.5);
    setCards(shuffled);
  }, [words]);

  // Handle card selection
  const handleCardClick = useCallback((card: MatchCard) => {
    if (card.isMatched || selectedCards.length >= 2) return;
    
    const newSelectedCards = [...selectedCards];
    
    if (selectedCards.find(c => c.id === card.id)) {
      // Deselect card
      setSelectedCards(selectedCards.filter(c => c.id !== card.id));
      setCards(prev => prev.map(c => 
        c.id === card.id ? { ...c, isSelected: false } : c
      ));
    } else {
      // Select card
      newSelectedCards.push(card);
      setSelectedCards(newSelectedCards);
      setCards(prev => prev.map(c => 
        c.id === card.id ? { ...c, isSelected: true } : c
      ));
      
      // Check for match if two cards are selected
      if (newSelectedCards.length === 2) {
        checkMatch(newSelectedCards);
      }
    }
  }, [selectedCards]);

  // Check if selected cards match
  const checkMatch = useCallback((selected: MatchCard[]) => {
    const [card1, card2] = selected;
    const responseTime = Date.now() - startTime;
    
    setAttempts(prev => prev + 1);
    
    if (
      card1.wordIndex === card2.wordIndex && 
      card1.type !== card2.type
    ) {
      // Match found!
      setMatchedPairs(prev => new Set([...prev, card1.wordIndex]));
      setResults(prev => [...prev, { correct: true, responseTime }]);
      
      // Update cards to show matched state
      setTimeout(() => {
        setCards(prev => prev.map(c => 
          c.wordIndex === card1.wordIndex 
            ? { ...c, isMatched: true, isSelected: false } 
            : c
        ));
        setSelectedCards([]);
        
        // Check if all matched
        if (matchedPairs.size + 1 === words.length) {
          // All matched!
          confetti({
            particleCount: 100,
            spread: 70,
            origin: { y: 0.6 }
          });
          
          setTimeout(() => {
            onComplete(results.concat({ correct: true, responseTime }));
          }, 1000);
        }
      }, 500);
    } else {
      // No match
      setResults(prev => [...prev, { correct: false, responseTime }]);
      
      // Show wrong feedback
      setCards(prev => prev.map(c => 
        (c.id === card1.id || c.id === card2.id)
          ? { ...c, isWrong: true } 
          : c
      ));
      
      setTimeout(() => {
        setCards(prev => prev.map(c => 
          (c.id === card1.id || c.id === card2.id)
            ? { ...c, isSelected: false, isWrong: false } 
            : c
        ));
        setSelectedCards([]);
      }, 1000);
    }
  }, [matchedPairs, words, results, startTime, onComplete]);

  // Shuffle cards
  const shuffleCards = () => {
    setCards(prev => {
      const unmatched = prev.filter(c => !c.isMatched);
      const matched = prev.filter(c => c.isMatched);
      const shuffled = [...unmatched].sort(() => Math.random() - 0.5);
      return [...shuffled, ...matched];
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="w-full"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <div className="text-sm text-muted-foreground">
            Matched: {matchedPairs.size} / {words.length}
          </div>
          <div className="text-sm text-muted-foreground">
            Attempts: {attempts}
          </div>
        </div>
        
        <Button
          variant="outline"
          size="sm"
          onClick={shuffleCards}
          className="gap-2"
        >
          <Shuffle className="h-4 w-4" />
          Shuffle
        </Button>
      </div>

      {/* Card Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        <AnimatePresence>
          {cards.map((card) => (
            <motion.div
              key={card.id}
              layout
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ 
                opacity: card.isMatched ? 0.5 : 1, 
                scale: 1,
                transition: { duration: 0.3 }
              }}
              exit={{ opacity: 0, scale: 0.8 }}
              whileHover={!card.isMatched ? { scale: 1.05 } : {}}
              whileTap={!card.isMatched ? { scale: 0.95 } : {}}
            >
              <Card
                className={`
                  cursor-pointer transition-all duration-300
                  ${card.isSelected ? 'ring-2 ring-primary shadow-lg' : ''}
                  ${card.isMatched ? 'bg-green-50 border-green-300 cursor-not-allowed' : ''}
                  ${card.isWrong ? 'bg-red-50 border-red-300 animate-shake' : ''}
                  ${!card.isMatched && !card.isSelected ? 'hover:shadow-md' : ''}
                `}
                onClick={() => handleCardClick(card)}
              >
                <CardContent className="p-4 h-24 flex items-center justify-center relative">
                  <p className={`
                    text-center font-medium
                    ${card.type === 'english' ? 'text-lg' : 'text-base text-muted-foreground'}
                    ${card.isMatched ? 'text-green-600' : ''}
                  `}>
                    {card.text}
                  </p>
                  
                  {card.isMatched && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="absolute top-2 right-2"
                    >
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    </motion.div>
                  )}
                  
                  {card.isWrong && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="absolute top-2 right-2"
                    >
                      <XCircle className="h-4 w-4 text-red-500" />
                    </motion.div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Success Message */}
      {matchedPairs.size === words.length && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-8 text-center"
        >
          <h3 className="text-2xl font-bold text-green-600 mb-2">
            Perfect Match! 🎉
          </h3>
          <p className="text-muted-foreground">
            You matched all {words.length} pairs in {attempts} attempts
          </p>
        </motion.div>
      )}
    </motion.div>
  );
};

export default MatchingMode;