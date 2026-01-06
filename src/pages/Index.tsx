import { useState, useEffect } from 'react';
import Icon from '@/components/ui/icon';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import TelegramAuth from '@/components/TelegramAuth';
import ActivityFeed from '@/components/ActivityFeed';
import { api, User, Promise as ApiPromise } from '@/lib/api';

interface Promise {
  id: string;
  title: string;
  description: string;
  deadline: string;
  status: 'active' | 'completed' | 'failed';
  category: string;
  progress: number;
}

interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  unlocked: boolean;
  date?: string;
}

const Index = () => {
  const { toast } = useToast();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('promises');
  const [newPromise, setNewPromise] = useState({ title: '', description: '', deadline: '', category: 'personal' });
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    if (token) {
      setUser({ id: 1, telegram_id: 123456789, first_name: 'Демо', username: 'demo' });
    }
    setIsLoading(false);
  }, []);

  if (isLoading) {
    return <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 flex items-center justify-center">
      <Icon name="Loader2" className="animate-spin text-primary" size={48} />
    </div>;
  }

  if (!user) {
    return <TelegramAuth onAuthSuccess={setUser} />;
  }

  const [promises, setPromises] = useState<Promise[]>([
    {
      id: '1',
      title: 'Заниматься спортом 3 раза в неделю',
      description: 'Ходить в зал или бегать в парке',
      deadline: '2026-02-01',
      status: 'active',
      category: 'Здоровье',
      progress: 60
    },
    {
      id: '2',
      title: 'Выучить 50 новых английских слов',
      description: 'Пополнить словарный запас',
      deadline: '2026-01-15',
      status: 'active',
      category: 'Образование',
      progress: 34
    },
    {
      id: '3',
      title: 'Прочитать 2 книги в месяц',
      description: 'Развивать привычку чтения',
      deadline: '2026-01-31',
      status: 'completed',
      category: 'Саморазвитие',
      progress: 100
    }
  ]);

  const [achievements, setAchievements] = useState<Achievement[]>([
    { id: '1', title: 'Первый шаг', description: 'Создано первое обещание', icon: 'Footprints', unlocked: true, date: '2026-01-01' },
    { id: '2', title: 'Выполнено!', description: 'Выполнено первое обещание', icon: 'CheckCircle', unlocked: true, date: '2026-01-05' },
    { id: '3', title: 'Неделя побед', description: 'Выполнено 5 обещаний за неделю', icon: 'Trophy', unlocked: false },
    { id: '4', title: 'Постоянство', description: 'Выполняйте обещания 30 дней подряд', icon: 'Flame', unlocked: false },
    { id: '5', title: 'Мастер слова', description: 'Выполнено 50 обещаний', icon: 'Crown', unlocked: false },
    { id: '6', title: 'Вдохновение', description: 'Поделитесь достижением с друзьями', icon: 'Share2', unlocked: false }
  ]);

  const stats = {
    totalPromises: promises.length,
    completed: promises.filter(p => p.status === 'completed').length,
    active: promises.filter(p => p.status === 'active').length,
    successRate: Math.round((promises.filter(p => p.status === 'completed').length / promises.length) * 100)
  };

  const handleCreatePromise = async () => {
    if (!newPromise.title || !newPromise.deadline) {
      toast({
        title: 'Заполните обязательные поля',
        description: 'Название и дедлайн обязательны',
        variant: 'destructive'
      });
      return;
    }

    try {
      await api.createPromise({
        title: newPromise.title,
        description: newPromise.description,
        deadline: newPromise.deadline,
        category: newPromise.category,
        is_public: true
      });

      const promise: Promise = {
        id: Date.now().toString(),
        title: newPromise.title,
        description: newPromise.description,
        deadline: newPromise.deadline,
        status: 'active',
        category: newPromise.category,
        progress: 0
      };

      setPromises([promise, ...promises]);
      setNewPromise({ title: '', description: '', deadline: '', category: 'personal' });
      setIsDialogOpen(false);
      
      toast({
        title: '✨ Обещание создано!',
        description: 'Теперь держите своё слово'
      });
    } catch (error) {
      toast({
        title: 'Ошибка',
        description: 'Не удалось создать обещание',
        variant: 'destructive'
      });
    }
  };

  const handleCompletePromise = async (id: string) => {
    try {
      await api.updatePromise(parseInt(id), { status: 'completed', progress: 100 });
      
      setPromises(promises.map(p => 
        p.id === id ? { ...p, status: 'completed' as const, progress: 100 } : p
      ));
      
      toast({
        title: '🎉 Поздравляем!',
        description: 'Вы выполнили своё обещание'
      });
    } catch (error) {
      toast({
        title: 'Ошибка',
        description: 'Не удалось обновить обещание',
        variant: 'destructive'
      });
    }
  };

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      'Здоровье': 'bg-green-500/10 text-green-700 border-green-500/20',
      'Образование': 'bg-blue-500/10 text-blue-700 border-blue-500/20',
      'Саморазвитие': 'bg-purple-500/10 text-purple-700 border-purple-500/20',
      'Работа': 'bg-orange-500/10 text-orange-700 border-orange-500/20',
      'Личное': 'bg-pink-500/10 text-pink-700 border-pink-500/20'
    };
    return colors[category] || 'bg-gray-500/10 text-gray-700 border-gray-500/20';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50">
      <div className="container max-w-6xl mx-auto px-4 py-8">
        <header className="mb-8 animate-fade-in">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg">
                <Icon name="Sparkles" className="text-white" size={24} />
              </div>
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                  IPU Promise
                </h1>
                <p className="text-muted-foreground text-sm">Держите своё слово</p>
              </div>
            </div>

            <Avatar className="h-12 w-12 border-2 border-primary/20">
              {user.photo_url && <AvatarImage src={user.photo_url} alt={user.first_name || 'User'} />}
              <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-white font-semibold">
                {(user.first_name?.[0] || user.username?.[0] || 'U').toUpperCase()}
              </AvatarFallback>
            </Avatar>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 animate-slide-up">
            <Card className="border-2 hover:shadow-lg transition-all duration-300 hover:scale-105">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                    <Icon name="Target" className="text-blue-600" size={20} />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{stats.totalPromises}</p>
                    <p className="text-xs text-muted-foreground">Всего</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-2 hover:shadow-lg transition-all duration-300 hover:scale-105">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-green-500/10 flex items-center justify-center">
                    <Icon name="CheckCircle2" className="text-green-600" size={20} />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{stats.completed}</p>
                    <p className="text-xs text-muted-foreground">Выполнено</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-2 hover:shadow-lg transition-all duration-300 hover:scale-105">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-orange-500/10 flex items-center justify-center">
                    <Icon name="Zap" className="text-orange-600" size={20} />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{stats.active}</p>
                    <p className="text-xs text-muted-foreground">Активных</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-2 hover:shadow-lg transition-all duration-300 hover:scale-105">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-purple-500/10 flex items-center justify-center">
                    <Icon name="TrendingUp" className="text-purple-600" size={20} />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{stats.successRate}%</p>
                    <p className="text-xs text-muted-foreground">Успех</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </header>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 h-14 bg-white/60 backdrop-blur-sm border-2">
            <TabsTrigger value="promises" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-primary data-[state=active]:to-accent data-[state=active]:text-white">
              <Icon name="ListChecks" className="mr-2" size={18} />
              Обещания
            </TabsTrigger>
            <TabsTrigger value="feed" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-primary data-[state=active]:to-accent data-[state=active]:text-white">
              <Icon name="Users" className="mr-2" size={18} />
              Лента
            </TabsTrigger>
            <TabsTrigger value="achievements" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-primary data-[state=active]:to-accent data-[state=active]:text-white">
              <Icon name="Award" className="mr-2" size={18} />
              Достижения
            </TabsTrigger>
            <TabsTrigger value="profile" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-primary data-[state=active]:to-accent data-[state=active]:text-white">
              <Icon name="User" className="mr-2" size={18} />
              Профиль
            </TabsTrigger>
          </TabsList>

          <TabsContent value="promises" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold">Мои обещания</h2>
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-gradient-to-r from-primary to-accent hover:opacity-90 transition-opacity shadow-lg">
                    <Icon name="Plus" className="mr-2" size={18} />
                    Создать обещание
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>Новое обещание</DialogTitle>
                    <DialogDescription>
                      Создайте обещание и выполните его
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="title">Название *</Label>
                      <Input
                        id="title"
                        placeholder="Например: Читать каждый день"
                        value={newPromise.title}
                        onChange={(e) => setNewPromise({ ...newPromise, title: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="description">Описание</Label>
                      <Textarea
                        id="description"
                        placeholder="Подробности обещания..."
                        value={newPromise.description}
                        onChange={(e) => setNewPromise({ ...newPromise, description: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="deadline">Дедлайн *</Label>
                      <Input
                        id="deadline"
                        type="date"
                        value={newPromise.deadline}
                        onChange={(e) => setNewPromise({ ...newPromise, deadline: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="category">Категория</Label>
                      <select
                        id="category"
                        className="w-full h-10 rounded-md border border-input bg-background px-3 py-2"
                        value={newPromise.category}
                        onChange={(e) => setNewPromise({ ...newPromise, category: e.target.value })}
                      >
                        <option value="Здоровье">Здоровье</option>
                        <option value="Образование">Образование</option>
                        <option value="Саморазвитие">Саморазвитие</option>
                        <option value="Работа">Работа</option>
                        <option value="Личное">Личное</option>
                      </select>
                    </div>
                    <Button onClick={handleCreatePromise} className="w-full bg-gradient-to-r from-primary to-accent">
                      Создать
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            <div className="grid gap-4">
              {promises.map((promise, index) => (
                <Card
                  key={promise.id}
                  className={`border-2 hover:shadow-xl transition-all duration-300 animate-scale-in ${
                    promise.status === 'completed' ? 'bg-green-50/50 border-green-200' : ''
                  }`}
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge className={`${getCategoryColor(promise.category)} border`}>
                            {promise.category}
                          </Badge>
                          {promise.status === 'completed' && (
                            <Badge className="bg-green-500/10 text-green-700 border-green-500/20 border">
                              <Icon name="CheckCircle2" className="mr-1" size={14} />
                              Выполнено
                            </Badge>
                          )}
                        </div>
                        <CardTitle className="text-xl mb-2">{promise.title}</CardTitle>
                        <CardDescription>{promise.description}</CardDescription>
                      </div>
                      <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-primary/10 to-accent/10 flex items-center justify-center">
                        <Icon name="Target" className="text-primary" size={24} />
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <div className="flex justify-between text-sm mb-2">
                          <span className="text-muted-foreground">Прогресс</span>
                          <span className="font-semibold">{promise.progress}%</span>
                        </div>
                        <Progress value={promise.progress} className="h-2" />
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Icon name="Calendar" size={16} />
                          <span>Дедлайн: {new Date(promise.deadline).toLocaleDateString('ru-RU')}</span>
                        </div>
                        {promise.status === 'active' && (
                          <Button
                            onClick={() => handleCompletePromise(promise.id)}
                            variant="outline"
                            size="sm"
                            className="border-green-200 hover:bg-green-50"
                          >
                            <Icon name="Check" className="mr-1" size={16} />
                            Выполнено
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="achievements" className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold mb-2">Достижения</h2>
              <p className="text-muted-foreground">
                Открыто {achievements.filter(a => a.unlocked).length} из {achievements.length}
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {achievements.map((achievement, index) => (
                <Card
                  key={achievement.id}
                  className={`border-2 transition-all duration-300 hover:scale-105 animate-scale-in ${
                    achievement.unlocked
                      ? 'bg-gradient-to-br from-yellow-50 to-orange-50 border-yellow-200 shadow-lg'
                      : 'bg-gray-50/50 border-gray-200 opacity-60'
                  }`}
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <CardContent className="pt-6">
                    <div className="flex items-start gap-4">
                      <div
                        className={`h-14 w-14 rounded-2xl flex items-center justify-center ${
                          achievement.unlocked
                            ? 'bg-gradient-to-br from-yellow-400 to-orange-400 shadow-md'
                            : 'bg-gray-300'
                        }`}
                      >
                        <Icon name={achievement.icon as any} className="text-white" size={28} />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-bold text-lg mb-1">{achievement.title}</h3>
                        <p className="text-sm text-muted-foreground mb-2">{achievement.description}</p>
                        {achievement.unlocked && achievement.date && (
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <Icon name="Calendar" size={12} />
                            {new Date(achievement.date).toLocaleDateString('ru-RU')}
                          </p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="feed" className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold mb-2">Лента активности</h2>
              <p className="text-muted-foreground">
                Смотрите, что делают другие пользователи
              </p>
            </div>
            <ActivityFeed />
          </TabsContent>

          <TabsContent value="profile" className="space-y-6">
            <Card className="border-2">
              <CardHeader>
                <CardTitle>Профиль</CardTitle>
                <CardDescription>Управление вашим аккаунтом</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center gap-6">
                  <Avatar className="h-24 w-24 border-4 border-primary/20">
                    {user.photo_url && <AvatarImage src={user.photo_url} alt={user.first_name || 'User'} />}
                    <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-white text-2xl font-bold">
                      {(user.first_name?.[0] || user.username?.[0] || 'U').toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="text-xl font-bold mb-1">{user.first_name || user.username || 'Пользователь'}</h3>
                    <p className="text-muted-foreground mb-3">@{user.username || 'telegram_user'}</p>
                    <Button variant="outline" size="sm">
                      <Icon name="Upload" className="mr-2" size={16} />
                      Изменить фото
                    </Button>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <Label htmlFor="name">Имя</Label>
                    <Input id="name" defaultValue={user.first_name || ''} />
                  </div>
                  <div>
                    <Label htmlFor="username">Username</Label>
                    <Input id="username" defaultValue={user.username || ''} disabled />
                  </div>
                  <div>
                    <Label htmlFor="bio">О себе</Label>
                    <Textarea id="bio" placeholder="Расскажите о себе..." />
                  </div>
                </div>

                <div className="pt-4 border-t">
                  <h4 className="font-semibold mb-4">Настройки уведомлений</h4>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">Email уведомления</p>
                        <p className="text-sm text-muted-foreground">Получать напоминания на почту</p>
                      </div>
                      <Button variant="outline" size="sm">Включить</Button>
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">Напоминания о дедлайнах</p>
                        <p className="text-sm text-muted-foreground">За день до истечения срока</p>
                      </div>
                      <Button variant="outline" size="sm">Включить</Button>
                    </div>
                  </div>
                </div>

                <Button className="w-full bg-gradient-to-r from-primary to-accent">
                  Сохранить изменения
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Index;