import { useContext } from 'react';
import { UserContext } from '@/App';
import { MessengerHub } from '@/components/telegram/MessengerHub';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { MessageCircle, Info } from 'lucide-react';

export default function Messages() {
  const { user } = useContext(UserContext);

  if (!user?.schoolId) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-12">
              <MessageCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">
                Please log in to access messages.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Messages</h1>
          <p className="text-muted-foreground mt-1">
            Chat with students via Telegram
          </p>
        </div>
      </div>

      {/* Info Card */}
      <Card className="bg-blue-50 border-blue-200 dark:bg-blue-950 dark:border-blue-800">
        <CardContent className="pt-4">
          <div className="flex items-start gap-3">
            <div className="bg-blue-100 dark:bg-blue-900 p-2 rounded-full">
              <Info className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="space-y-1">
              <h3 className="font-medium text-blue-900 dark:text-blue-100">Telegram Messaging</h3>
              <p className="text-sm text-blue-800 dark:text-blue-200">
                Chat with students who have linked their Telegram accounts. Students can also use commands like /schedule, /subscriptions, and /balance to check their information.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Messenger Hub */}
      <MessengerHub schoolId={user.schoolId} />
    </div>
  );
}
