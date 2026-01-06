import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import Icon from '@/components/ui/icon';
import { api, Activity } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

const ActivityFeed = () => {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const { toast } = useToast();

  const loadActivities = async (reset = false) => {
    try {
      const currentOffset = reset ? 0 : offset;
      const result = await api.getFeed(20, currentOffset);
      
      if (reset) {
        setActivities(result.activities);
        setOffset(20);
      } else {
        setActivities([...activities, ...result.activities]);
        setOffset(offset + result.activities.length);
      }
      
      setHasMore(result.activities.length === 20);
    } catch (error) {
      toast({
        title: 'Ошибка загрузки',
        description: 'Не удалось загрузить ленту активности',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadActivities(true);
  }, []);

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'created':
        return <Icon name="Plus" className="text-blue-600" size={20} />;
      case 'completed':
        return <Icon name="CheckCircle2" className="text-green-600" size={20} />;
      case 'failed':
        return <Icon name="XCircle" className="text-red-600" size={20} />;
      case 'achievement_unlocked':
        return <Icon name="Award" className="text-yellow-600" size={20} />;
      default:
        return <Icon name="Circle" className="text-gray-600" size={20} />;
    }
  };

  const getActivityText = (activity: Activity) => {
    const userName = activity.user.first_name || activity.user.username || 'Пользователь';
    
    switch (activity.type) {
      case 'created':
        return `${userName} создал обещание`;
      case 'completed':
        return `${userName} выполнил обещание`;
      case 'failed':
        return `${userName} не выполнил обещание`;
      case 'achievement_unlocked':
        return `${userName} получил достижение`;
      default:
        return `${userName} совершил действие`;
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

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'только что';
    if (diffMins < 60) return `${diffMins} мин назад`;
    if (diffHours < 24) return `${diffHours} ч назад`;
    if (diffDays < 7) return `${diffDays} д назад`;
    
    return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => (
          <Card key={i} className="border-2 animate-pulse">
            <CardContent className="pt-6">
              <div className="flex gap-4">
                <div className="h-12 w-12 bg-gray-200 rounded-full"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <Card className="border-2">
        <CardContent className="pt-12 pb-12 text-center">
          <Icon name="Users" className="text-muted-foreground mx-auto mb-4" size={48} />
          <p className="text-lg font-semibold mb-2">Пока нет активности</p>
          <p className="text-muted-foreground text-sm">
            Создайте первое обещание и оно появится в ленте
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {activities.map((activity, index) => (
        <Card
          key={activity.id}
          className="border-2 hover:shadow-lg transition-all duration-300 animate-fade-in"
          style={{ animationDelay: `${index * 50}ms` }}
        >
          <CardContent className="pt-6">
            <div className="flex gap-4">
              <Avatar className="h-12 w-12 border-2 border-primary/20">
                {activity.user.photo_url && (
                  <AvatarImage src={activity.user.photo_url} alt={activity.user.first_name || 'User'} />
                )}
                <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-white font-semibold">
                  {(activity.user.first_name?.[0] || activity.user.username?.[0] || 'U').toUpperCase()}
                </AvatarFallback>
              </Avatar>

              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold">
                      {activity.user.first_name || activity.user.username || 'Пользователь'}
                    </span>
                    <div className="h-6 w-6 rounded-lg bg-gray-100 flex items-center justify-center">
                      {getActivityIcon(activity.type)}
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {formatDate(activity.created_at)}
                  </span>
                </div>

                <p className="text-sm text-muted-foreground mb-3">
                  {getActivityText(activity)}
                </p>

                {activity.promise && (
                  <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl p-3 border border-purple-100">
                    <div className="flex items-start gap-2">
                      <Icon name="Target" className="text-primary flex-shrink-0 mt-0.5" size={18} />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm mb-1 line-clamp-2">
                          {activity.promise.title}
                        </p>
                        <Badge className={`${getCategoryColor(activity.promise.category)} border text-xs`}>
                          {activity.promise.category}
                        </Badge>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}

      {hasMore && (
        <div className="text-center pt-4">
          <Button
            onClick={() => loadActivities(false)}
            variant="outline"
            className="border-2"
          >
            <Icon name="RefreshCw" className="mr-2" size={18} />
            Загрузить ещё
          </Button>
        </div>
      )}
    </div>
  );
};

export default ActivityFeed;
