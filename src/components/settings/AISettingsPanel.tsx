import React, { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2, Bot, Eye, EyeOff, Sparkles, Info } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { toast } from '@/components/ui/use-toast';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { aiConfigurationService, AIConfiguration } from '@/services/aiConfiguration.service';

interface AISettingsPanelProps {
  schoolId: string;
}

export function AISettingsPanel({ schoolId }: AISettingsPanelProps) {
  const queryClient = useQueryClient();
  const [showApiKey, setShowApiKey] = useState(false);
  const [config, setConfig] = useState<AIConfiguration>(
    aiConfigurationService.getDefaultConfiguration()
  );

  // Fetch current configuration
  const { data: currentConfig, isLoading } = useQuery({
    queryKey: ['ai-configuration', schoolId],
    queryFn: () => aiConfigurationService.getConfiguration(schoolId),
    enabled: !!schoolId
  });

  // Update local state when data is loaded
  useEffect(() => {
    if (currentConfig) {
      setConfig(currentConfig);
    }
  }, [currentConfig]);

  // Save configuration mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      if (config.enabled && !config.apiKey) {
        throw new Error('Please provide an OpenAI API key');
      }
      await aiConfigurationService.updateConfiguration(schoolId, config);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-configuration', schoolId] });
      toast({
        title: 'AI Configuration Saved',
        description: 'Your AI assistant settings have been updated successfully.'
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to save AI configuration',
        variant: 'destructive'
      });
    }
  });

  const handleSave = () => {
    saveMutation.mutate();
  };

  const models = aiConfigurationService.getAvailableModels();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Bot className="h-5 w-5 text-primary" />
            <CardTitle>AI Assistant Configuration</CardTitle>
          </div>
          <CardDescription>
            Configure an AI-powered chatbot to automatically respond to student messages via Telegram.
            Each school can customize the AI's personality and behavior.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Enable AI Toggle */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="ai-enabled" className="text-base">
                Enable AI Assistant
              </Label>
              <div className="text-sm text-muted-foreground">
                Activate intelligent auto-responses for student messages
              </div>
            </div>
            <Switch
              id="ai-enabled"
              checked={config.enabled}
              onCheckedChange={(enabled) => setConfig({ ...config, enabled })}
            />
          </div>

          {config.enabled && (
            <>
              {/* API Key */}
              <div className="space-y-2">
                <Label htmlFor="api-key">
                  OpenAI API Key <span className="text-destructive">*</span>
                </Label>
                <div className="relative">
                  <Input
                    id="api-key"
                    type={showApiKey ? 'text' : 'password'}
                    placeholder="sk-..."
                    value={config.apiKey}
                    onChange={(e) => setConfig({ ...config, apiKey: e.target.value })}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowApiKey(!showApiKey)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Get your API key from{' '}
                  <a
                    href="https://platform.openai.com/api-keys"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    OpenAI Dashboard
                  </a>
                </p>
              </div>

              {/* Model Selection */}
              <div className="space-y-2">
                <Label htmlFor="model">AI Model</Label>
                <Select
                  value={config.model}
                  onValueChange={(value: any) => setConfig({ ...config, model: value })}
                >
                  <SelectTrigger id="model">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {models.map((model) => (
                      <SelectItem key={model.id} value={model.id}>
                        <div className="flex items-center gap-2">
                          {model.name}
                          {model.recommended && (
                            <span className="text-xs text-primary">(Recommended)</span>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  {models.find((m) => m.id === config.model)?.description}
                </p>
              </div>

              {/* Max Tokens */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="max-tokens">Maximum Response Length</Label>
                  <span className="text-sm text-muted-foreground">{config.maxTokens} tokens</span>
                </div>
                <Slider
                  id="max-tokens"
                  min={50}
                  max={500}
                  step={50}
                  value={[config.maxTokens]}
                  onValueChange={([value]) => setConfig({ ...config, maxTokens: value })}
                  className="w-full"
                />
                <p className="text-xs text-muted-foreground">
                  Lower values = shorter, cheaper responses. Higher values = more detailed but costly.
                </p>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Personality Settings */}
      {config.enabled && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              <CardTitle>Personality & Tone</CardTitle>
            </div>
            <CardDescription>
              Customize how the AI communicates with your students
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Friendliness Level */}
            <div className="space-y-2">
              <Label htmlFor="friendliness">Friendliness Level</Label>
              <Select
                value={config.personality.friendlinessLevel}
                onValueChange={(value: any) =>
                  setConfig({
                    ...config,
                    personality: { ...config.personality, friendlinessLevel: value }
                  })
                }
              >
                <SelectTrigger id="friendliness">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="formal">Formal - Professional and polite</SelectItem>
                  <SelectItem value="friendly">Friendly - Warm but professional</SelectItem>
                  <SelectItem value="very_friendly">Very Friendly - Casual and relaxed</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Use Humor */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="use-humor">Use Humor & Emojis</Label>
                <div className="text-sm text-muted-foreground">
                  Allow the AI to use appropriate humor and emojis
                </div>
              </div>
              <Switch
                id="use-humor"
                checked={config.personality.useHumor}
                onCheckedChange={(useHumor) =>
                  setConfig({
                    ...config,
                    personality: { ...config.personality, useHumor }
                  })
                }
              />
            </div>

            {/* Tone */}
            <div className="space-y-2">
              <Label htmlFor="tone">Communication Tone</Label>
              <Input
                id="tone"
                placeholder="e.g., enthusiastic, supportive, motivating"
                value={config.personality.tone}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    personality: { ...config.personality, tone: e.target.value }
                  })
                }
              />
              <p className="text-xs text-muted-foreground">
                Describe the overall tone you want the AI to use
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Custom Context & Instructions */}
      {config.enabled && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Info className="h-5 w-5 text-primary" />
              <CardTitle>Custom Context & Instructions</CardTitle>
            </div>
            <CardDescription>
              Provide specific information about your school to help the AI give better responses
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Custom Context */}
            <div className="space-y-2">
              <Label htmlFor="custom-context">School Information & Context</Label>
              <Textarea
                id="custom-context"
                placeholder="e.g., We are an online English language school specializing in business English for Russian speakers. Our courses focus on practical communication skills..."
                value={config.customContext}
                onChange={(e) => setConfig({ ...config, customContext: e.target.value })}
                rows={4}
              />
              <p className="text-xs text-muted-foreground">
                Provide context about your school, courses, teaching methodology, etc.
              </p>
            </div>

            {/* Custom Instructions */}
            <div className="space-y-2">
              <Label htmlFor="custom-instructions">Additional Instructions</Label>
              <Textarea
                id="custom-instructions"
                placeholder="e.g., Always mention our satisfaction guarantee when students ask about refunds. Remind students to complete homework before lessons..."
                value={config.customInstructions}
                onChange={(e) => setConfig({ ...config, customInstructions: e.target.value })}
                rows={4}
              />
              <p className="text-xs text-muted-foreground">
                Specific instructions for how the AI should handle certain situations
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Info Alert */}
      {config.enabled && (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            <strong>Phase 1 - Read-Only Mode:</strong> The AI can answer questions about schedules,
            subscriptions, and payments, but cannot make changes or take actions. Complex or
            sensitive requests will be escalated to administrators automatically.
          </AlertDescription>
        </Alert>
      )}

      {/* Save Button */}
      <div className="flex justify-end gap-2">
        <Button
          onClick={handleSave}
          disabled={saveMutation.isPending}
          size="lg"
        >
          {saveMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Save AI Configuration
        </Button>
      </div>
    </div>
  );
}
