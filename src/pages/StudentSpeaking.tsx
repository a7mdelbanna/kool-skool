import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import StudentSpeakingHub from '@/components/speaking/StudentSpeakingHub';
import TopicDetailView from '@/components/speaking/TopicDetailView';
import { SpeakingTopic, SpeakingConversation } from '@/types/speakingPractice';

const StudentSpeaking = () => {
  const { studentId } = useParams<{ studentId: string }>();
  const [selectedTopic, setSelectedTopic] = useState<SpeakingTopic | null>(null);
  const [selectedConversation, setSelectedConversation] = useState<SpeakingConversation | undefined>();

  if (!studentId) {
    return <div>Invalid student ID</div>;
  }

  const handleTopicSelect = (topic: SpeakingTopic, conversation?: SpeakingConversation) => {
    setSelectedTopic(topic);
    setSelectedConversation(conversation);
  };

  const handleBack = () => {
    setSelectedTopic(null);
    setSelectedConversation(undefined);
  };

  if (selectedTopic) {
    return (
      <TopicDetailView
        topic={selectedTopic}
        conversation={selectedConversation}
        studentId={studentId}
        onBack={handleBack}
      />
    );
  }

  return (
    <div className="container mx-auto py-6">
      <h1 className="text-3xl font-bold mb-6">Speaking Practice</h1>
      <StudentSpeakingHub
        studentId={studentId}
        onTopicSelect={handleTopicSelect}
      />
    </div>
  );
};

export default StudentSpeaking;