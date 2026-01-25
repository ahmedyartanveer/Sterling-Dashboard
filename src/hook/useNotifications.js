import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../auth/AuthProvider';
import axiosInstance from '../api/axios';

const formatDate = (dateString) => {
    if (!dateString) return null;
    try {
        return new Date(dateString);
    } catch {
        return null;
    }
};

export const useNotifications = () => {
    const { user } = useAuth();

    const { data, isLoading, error, refetch } = useQuery({
        queryKey: ['notifications-count', user?.role],
        queryFn: async () => {
            if (!user) {
                return {
                    locates: [],
                    workOrders: [],
                    latestNotifications: [],
                    count: 0,
                    totalActualCount: 0,
                    locatesCount: 0,
                    workOrdersCount: 0,
                    unseenLocateIds: [],
                    unseenRmeIds: [],
                    unseenIds: [],
                };
            }

            const role = user.role?.toUpperCase();
            if (role !== 'SUPERADMIN' && role !== 'MANAGER') {
                return {
                    locates: [],
                    workOrders: [],
                    latestNotifications: [],
                    count: 0,
                    totalActualCount: 0,
                    locatesCount: 0,
                    workOrdersCount: 0,
                    unseenLocateIds: [],
                    unseenRmeIds: [],
                    unseenIds: [],
                };
            }

            const [locatesResponse, workOrdersResponse] = await Promise.all([
                axiosInstance.get('/locates/'),
                axiosInstance.get('/work-orders-today/'),
            ]);

            const locatesData = Array.isArray(locatesResponse.data)
                ? locatesResponse.data
                : locatesResponse.data?.data || [];

            const workOrdersData = Array.isArray(workOrdersResponse.data)
                ? workOrdersResponse.data
                : workOrdersResponse.data?.data || [];

            const oneMonthAgo = new Date();
            oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

            let locatesCount = 0;
            let workOrdersCount = 0;

            const latestNotifications = [];
            const unseenLocateIds = [];
            const unseenRmeIds = [];

            locatesData.forEach(locate => {
                const createdDate = formatDate(
                    locate.created_at || locate.created_date
                );
                if (!createdDate) return;

                if (createdDate >= oneMonthAgo && !locate.is_seen) {
                    locatesCount++;

                    const id = `locate-${locate.id}`;
                    unseenLocateIds.push(id);

                    if (latestNotifications.length < 10) {
                        latestNotifications.push({
                            id,
                            type: 'locate',
                            timestamp: createdDate,
                        });
                    }
                }
            });

            workOrdersData.forEach(workOrder => {
                const elapsedDate = formatDate(workOrder.elapsed_time);
                if (!elapsedDate) return;

                if (elapsedDate >= oneMonthAgo && !workOrder.is_seen) {
                    workOrdersCount++;

                    const id = `rme-${workOrder.id}`;
                    unseenRmeIds.push(id);

                    if (latestNotifications.length < 10) {
                        latestNotifications.push({
                            id,
                            type: 'RME',
                            timestamp: elapsedDate,
                        });
                    }
                }
            });

            latestNotifications.sort((a, b) => b.timestamp - a.timestamp);

            const unseenIds = [...unseenLocateIds, ...unseenRmeIds];
            const totalActualCount = locatesCount + workOrdersCount;

            return {
                locates: locatesData,
                workOrders: workOrdersData,
                latestNotifications: latestNotifications.slice(0, 10),
                locatesCount,
                workOrdersCount,
                totalActualCount,
                unseenLocateIds,
                unseenRmeIds,
                unseenIds,
                count: Math.min(totalActualCount, 10),
            };
        },
        staleTime: 30000,
        refetchInterval: 60000,
    });

    return {
        notifications: data,
        isLoading,
        error,
        refetch,
        badgeCount: data?.count || 0,
        totalCount: data?.totalActualCount || 0,
        locatesCount: data?.locatesCount || 0,
        rmeCount: data?.workOrdersCount || 0,
        unseenLocateIds: data?.unseenLocateIds || [],
        unseenRmeIds: data?.unseenRmeIds || [],
        unseenIds: data?.unseenIds || [],
    };
};