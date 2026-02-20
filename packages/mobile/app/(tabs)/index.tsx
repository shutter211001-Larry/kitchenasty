import { View, Text, ScrollView, Pressable, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

export default function HomeScreen() {
  const router = useRouter();
  const { t } = useTranslation();

  return (
    <ScrollView className="flex-1 bg-gray-50">
      {/* Hero */}
      <View className="bg-primary-600 px-6 pt-12 pb-16">
        <Text className="text-white text-3xl font-bold mb-3">{t('home.heroTitle')}</Text>
        <Text className="text-primary-100 text-base leading-6 mb-8">
          {t('home.heroDescription')}
        </Text>
        <View className="flex-row gap-3">
          <Pressable
            onPress={() => router.push('/(tabs)/menu')}
            className="bg-white px-6 py-3 rounded-xl"
          >
            <Text className="text-primary-600 font-semibold text-base">{t('home.viewMenu')}</Text>
          </Pressable>
          <Pressable
            onPress={() => router.push('/locations')}
            className="border-2 border-white px-6 py-3 rounded-xl"
          >
            <Text className="text-white font-semibold text-base">{t('home.findLocation')}</Text>
          </Pressable>
        </View>
      </View>

      {/* Features */}
      <View className="px-6 -mt-8">
        <FeatureCard
          title={t('home.fastDelivery')}
          description={t('home.fastDeliveryDesc')}
          icon="fast"
        />
        <FeatureCard
          title={t('home.easyOrdering')}
          description={t('home.easyOrderingDesc')}
          icon="easy"
        />
        <FeatureCard
          title={t('home.tableReservations')}
          description={t('home.tableReservationsDesc')}
          icon="table"
        />
      </View>

      {/* CTA */}
      <View className="px-6 py-8 items-center">
        <Text className="text-xl font-bold text-gray-900 mb-2">{t('home.readyToOrder')}</Text>
        <Text className="text-gray-500 text-center text-sm mb-4">{t('home.readyToOrderDesc')}</Text>
        <Pressable
          onPress={() => router.push('/(auth)/register')}
          className="bg-primary-600 px-8 py-3.5 rounded-xl"
        >
          <Text className="text-white font-semibold text-base">{t('home.createAccount')}</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

function FeatureCard({ title, description, icon }: { title: string; description: string; icon: string }) {
  const icons: Record<string, string> = { fast: '\u26A1', easy: '\u2714', table: '\u{1F37D}' };

  return (
    <View className="bg-white rounded-xl p-5 mb-3 shadow-sm border border-gray-100">
      <View className="flex-row items-center mb-2">
        <Text className="text-2xl mr-3">{icons[icon] || '\u25CF'}</Text>
        <Text className="text-lg font-semibold text-gray-900">{title}</Text>
      </View>
      <Text className="text-gray-500 text-sm leading-5">{description}</Text>
    </View>
  );
}
