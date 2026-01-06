import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Icon from '@/components/ui/icon';
import { api, User } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

interface TelegramAuthProps {
  onAuthSuccess: (user: User) => void;
}

declare global {
  interface Window {
    Telegram?: {
      WebApp?: {
        initData: string;
        initDataUnsafe: any;
        ready: () => void;
        expand: () => void;
      };
    };
  }
}

const TelegramAuth = ({ onAuthSuccess }: TelegramAuthProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [isTelegramApp, setIsTelegramApp] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (window.Telegram?.WebApp) {
      setIsTelegramApp(true);
      window.Telegram.WebApp.ready();
      window.Telegram.WebApp.expand();
      
      const initData = window.Telegram.WebApp.initData;
      if (initData) {
        handleTelegramAuth(initData);
      }
    }
  }, []);

  const handleTelegramAuth = async (initData: string) => {
    setIsLoading(true);
    try {
      const result = await api.login(initData);
      toast({
        title: '✨ Добро пожаловать!',
        description: `Привет, ${result.user.first_name || 'пользователь'}!`
      });
      onAuthSuccess(result.user);
    } catch (error) {
      toast({
        title: 'Ошибка авторизации',
        description: error instanceof Error ? error.message : 'Попробуйте позже',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDemoLogin = () => {
    const demoUser: User = {
      id: 1,
      telegram_id: 123456789,
      first_name: 'Демо',
      last_name: 'Пользователь',
      username: 'demo_user'
    };
    
    api.setToken('demo:token:signature');
    onAuthSuccess(demoUser);
    
    toast({
      title: '🎭 Демо режим',
      description: 'Вы вошли в демо-версию приложения'
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full border-2 shadow-xl">
          <CardContent className="pt-12 pb-12 text-center">
            <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center mx-auto mb-4 animate-pulse">
              <Icon name="Loader2" className="text-white animate-spin" size={32} />
            </div>
            <p className="text-lg font-semibold">Авторизация...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 flex items-center justify-center p-4">
      <Card className="max-w-md w-full border-2 shadow-xl animate-scale-in">
        <CardHeader className="text-center pb-4">
          <div className="h-20 w-20 rounded-3xl bg-gradient-to-br from-primary to-accent flex items-center justify-center mx-auto mb-4 shadow-lg">
            <Icon name="Sparkles" className="text-white" size={40} />
          </div>
          <CardTitle className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            IPU Promise
          </CardTitle>
          <CardDescription className="text-base mt-2">
            Держите своё слово
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {isTelegramApp ? (
            <div className="text-center py-8">
              <Icon name="CheckCircle2" className="text-green-500 mx-auto mb-4" size={48} />
              <p className="text-lg font-semibold mb-2">Telegram обнаружен</p>
              <p className="text-muted-foreground text-sm">
                Автоматическая авторизация через Telegram WebApp
              </p>
            </div>
          ) : (
            <>
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-4">
                <div className="flex gap-3">
                  <Icon name="Info" className="text-blue-600 flex-shrink-0 mt-0.5" size={20} />
                  <div className="text-sm">
                    <p className="font-semibold text-blue-900 mb-1">Откройте через Telegram</p>
                    <p className="text-blue-700">
                      Для полной функциональности запустите приложение через Telegram бота
                    </p>
                  </div>
                </div>
              </div>

              <Button
                onClick={handleDemoLogin}
                className="w-full h-12 bg-gradient-to-r from-primary to-accent hover:opacity-90 transition-opacity text-base font-semibold shadow-lg"
              >
                <Icon name="Play" className="mr-2" size={20} />
                Попробовать демо
              </Button>

              <div className="text-center text-sm text-muted-foreground">
                <p>или</p>
              </div>

              <a
                href="https://t.me/ipu_promise_bot"
                target="_blank"
                rel="noopener noreferrer"
                className="block"
              >
                <Button
                  variant="outline"
                  className="w-full h-12 text-base font-semibold border-2 hover:bg-blue-50"
                >
                  <Icon name="MessageCircle" className="mr-2" size={20} />
                  Открыть в Telegram
                </Button>
              </a>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default TelegramAuth;
