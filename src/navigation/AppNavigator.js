import React, { useRef, useEffect } from 'react';
import { Platform, View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';

import { COLORS } from '../constants/colors';
import { useLanguage } from '../context/LanguageContext';

// ── Per-tab accent colours ────────────────────────────────────────────────────
const TAB_ACCENTS = {
  AgriStore:   '#059669',
  AnimalTrade: '#F97316',
  Rent:        '#0284C7',
  Weather:     '#3B82F6',
  Community:   '#6366F1',
  Account:     '#9333EA',
};

// ── Custom Immersive Tab Bar ──────────────────────────────────────────────────
function ImmersiveTabBar({ state, descriptors, navigation }) {
  const pressAnims = useRef(state.routes.map(() => new Animated.Value(1))).current;

  const onPress = (route, index, isFocused) => {
    const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
    if (!isFocused && !event.defaultPrevented) {
      Animated.sequence([
        Animated.timing(pressAnims[index], { toValue: 0.82, duration: 80, useNativeDriver: true }),
        Animated.spring(pressAnims[index], { toValue: 1, tension: 160, friction: 7, useNativeDriver: true }),
      ]).start();
      navigation.navigate(route.name);
    }
  };

  return (
    <View style={TB.bar}>
      {state.routes.map((route, index) => {
        const { options } = descriptors[route.key];
        const focused = state.index === index;
        const accent  = TAB_ACCENTS[route.name] || '#10B981';

        const iconMap = {
          AgriStore:   focused ? 'storefront'         : 'storefront-outline',
          AnimalTrade: focused ? 'paw'                : 'paw-outline',
          Rent:        focused ? 'construct'          : 'construct-outline',
          Weather:     focused ? 'partly-sunny'       : 'partly-sunny-outline',
          Community:   focused ? 'people'             : 'people-outline',
          Account:     focused ? 'person-circle'      : 'person-circle-outline',
        };

        return (
          <Animated.View key={route.key} style={[TB.tab, { transform: [{ scale: pressAnims[index] }] }]}>
            <TouchableOpacity
              activeOpacity={1}
              onPress={() => onPress(route, index, focused)}
              style={TB.tabInner}
            >
              {/* Glow ring behind icon when focused */}
              {focused && (
                <View style={[TB.glowRing, { backgroundColor: accent + '22', borderColor: accent + '40' }]} />
              )}
              <Ionicons
                name={iconMap[route.name] || 'ellipse'}
                size={24}
                color={focused ? accent : '#94A3B8'}
              />
              <Text style={[TB.label, { color: focused ? accent : '#94A3B8' }]}>
                {options.tabBarLabel ?? route.name}
              </Text>
              {/* Active dot indicator */}
              {focused && <View style={[TB.activeDot, { backgroundColor: accent }]} />}
            </TouchableOpacity>
          </Animated.View>
        );
      })}
    </View>
  );
}

const TB = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.08)',
    height: Platform.OS === 'ios' ? 88 : 68,
    paddingBottom: Platform.OS === 'ios' ? 22 : 8,
    paddingTop: 6,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: -3 },
    elevation: 10,
  },
  tab: { flex: 1 },
  tabInner: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 3 },
  glowRing: {
    position: 'absolute',
    width: 44, height: 44, borderRadius: 22,
    borderWidth: 1,
    top: -4,
  },
  label: { fontSize: 10, fontWeight: '600', letterSpacing: 0.2 },
  activeDot: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 0 : 2,
    width: 4, height: 4, borderRadius: 2,
  },
});

// Agri Store Screens
import AgriStoreHome        from '../screens/AgriStore/AgriStoreHome';
import ProductDetail        from '../screens/AgriStore/ProductDetail';
import AIRecommendation     from '../screens/AgriStore/AIRecommendation';
import CartScreen           from '../screens/AgriStore/CartScreen';
import CheckoutScreen       from '../screens/AgriStore/CheckoutScreen';
import OrderConfirmedScreen from '../screens/AgriStore/OrderConfirmedScreen';

// Animal Trade Screens
import AnimalTradeHome   from '../screens/AnimalTrade/AnimalTradeHome';
import AnimalDetail      from '../screens/AnimalTrade/AnimalDetail';
import AddAnimalListing  from '../screens/AnimalTrade/AddAnimalListing';
import ChatScreen        from '../screens/AnimalTrade/ChatScreen';

// Rent Screens
import RentHome       from '../screens/Rent/RentHome';
import MachineryDetail from '../screens/Rent/MachineryDetail';
import LabourDetail    from '../screens/Rent/LabourDetail';

// Weather Screens
import WeatherHome       from '../screens/Weather/WeatherHome';
import CropCalendar     from '../screens/Weather/CropCalendar';
import CropDetail       from '../screens/Weather/CropDetail';
import StateCropsScreen from '../screens/Weather/StateCropsScreen';

// Community Screens
import CommunityHome        from '../screens/Community/CommunityHome';
import PostDetail           from '../screens/Community/PostDetail';
import CreatePost           from '../screens/Community/CreatePost';
import GroupsScreen         from '../screens/Community/GroupsScreen';
import GroupChatScreen      from '../screens/Community/GroupChatScreen';
import GroupInfoScreen      from '../screens/Community/GroupInfoScreen';
import CreateGroupScreen    from '../screens/Community/CreateGroupScreen';
import DirectMessagesScreen from '../screens/Community/DirectMessagesScreen';
import DirectChatScreen     from '../screens/Community/DirectChatScreen';
import NewChatScreen        from '../screens/Community/NewChatScreen';

// Profile Screen
import ProfileScreen from '../screens/Profile/ProfileScreen';

const Tab            = createBottomTabNavigator();
const AgriStack      = createStackNavigator();
const AnimalStack    = createStackNavigator();
const RentStack      = createStackNavigator();
const WeatherStack   = createStackNavigator();
const CommunityStack = createStackNavigator();
const ProfileStack   = createStackNavigator();

const defaultScreenOptions = {
  headerStyle: { backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.08)' },
  headerTintColor: '#1E293B',
  headerTitleStyle: { fontWeight: '700', fontSize: 17, color: '#1E293B' },
  headerBackTitleVisible: false,
};

const communityScreenOptions = {
  headerStyle: { backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.08)' },
  headerTintColor: '#1E293B',
  headerTitleStyle: { fontWeight: '700', fontSize: 17, color: '#1E293B' },
  headerBackTitleVisible: false,
};

function AgriStoreNavigator() {
  return (
    <AgriStack.Navigator screenOptions={defaultScreenOptions}>
      <AgriStack.Screen name="AgriStoreHome"   component={AgriStoreHome}        options={{ headerShown: false }} />
      <AgriStack.Screen name="ProductDetail"   component={ProductDetail}        options={{ title: 'Product Details' }} />
      <AgriStack.Screen name="AIRecommendation" component={AIRecommendation}    options={{ title: 'AI Crop Advisor' }} />
      <AgriStack.Screen name="Cart"            component={CartScreen}           options={{ title: 'My Cart' }} />
      <AgriStack.Screen name="Checkout"        component={CheckoutScreen}       options={{ title: 'Checkout' }} />
      <AgriStack.Screen name="OrderConfirmed"  component={OrderConfirmedScreen} options={{ title: 'Order Confirmed', headerShown: false }} />
    </AgriStack.Navigator>
  );
}

function AnimalTradeNavigator() {
  return (
    <AnimalStack.Navigator screenOptions={defaultScreenOptions}>
      <AnimalStack.Screen name="AnimalTradeHome"   component={AnimalTradeHome}   options={{ headerShown: false }} />
      <AnimalStack.Screen name="AnimalDetail"      component={AnimalDetail}      options={{ title: 'Animal Details' }} />
      <AnimalStack.Screen name="AddAnimalListing"  component={AddAnimalListing}  options={{ title: 'Sell Your Animal' }} />
      <AnimalStack.Screen name="Chat"              component={ChatScreen}        options={({ route }) => ({ title: route.params?.sellerName || 'Chat' })} />
    </AnimalStack.Navigator>
  );
}

function RentNavigator() {
  return (
    <RentStack.Navigator screenOptions={defaultScreenOptions}>
      <RentStack.Screen name="RentHome"        component={RentHome}        options={{ headerShown: false }} />
      <RentStack.Screen name="MachineryDetail" component={MachineryDetail} options={{ title: 'Machinery Details' }} />
      <RentStack.Screen name="LabourDetail"    component={LabourDetail}    options={{ title: 'Labour Details' }} />
    </RentStack.Navigator>
  );
}

function WeatherNavigator() {
  return (
    <WeatherStack.Navigator screenOptions={defaultScreenOptions}>
      <WeatherStack.Screen name="WeatherHome"  component={WeatherHome}       options={{ headerShown: false }} />
      <WeatherStack.Screen name="CropCalendar" component={CropCalendar}     options={{ title: 'Crop Calendar' }} />
      <WeatherStack.Screen name="CropDetail"   component={CropDetail}       options={({ route }) => ({ title: route.params?.cropName || 'Crop Details' })} />
      <WeatherStack.Screen name="StateCrops"   component={StateCropsScreen} options={{ headerShown: false }} />
    </WeatherStack.Navigator>
  );
}

function CommunityNavigator() {
  return (
    <CommunityStack.Navigator screenOptions={defaultScreenOptions}>
      {/* Community Feed */}
      <CommunityStack.Screen name="CommunityHome"  component={CommunityHome}  options={{ headerShown: false }} />
      <CommunityStack.Screen name="PostDetail"     component={PostDetail}     options={{ title: 'Discussion' }} />
      <CommunityStack.Screen name="CreatePost"     component={CreatePost}     options={{ title: 'Ask Community' }} />

      {/* Groups */}
      <CommunityStack.Screen
        name="Groups"
        component={GroupsScreen}
        options={{ ...communityScreenOptions, title: 'Community Groups' }}
      />
      <CommunityStack.Screen
        name="GroupChat"
        component={GroupChatScreen}
        options={{ headerShown: false }}
      />
      <CommunityStack.Screen
        name="GroupInfo"
        component={GroupInfoScreen}
        options={{ ...communityScreenOptions, title: 'Group Info' }}
      />
      <CommunityStack.Screen
        name="CreateGroup"
        component={CreateGroupScreen}
        options={{ ...communityScreenOptions, title: 'New Group' }}
      />

      {/* Direct Messages */}
      <CommunityStack.Screen
        name="DirectMessages"
        component={DirectMessagesScreen}
        options={{ ...communityScreenOptions, title: 'Messages' }}
      />
      <CommunityStack.Screen
        name="DirectChat"
        component={DirectChatScreen}
        options={{ headerShown: false }}
      />
      <CommunityStack.Screen
        name="NewChat"
        component={NewChatScreen}
        options={{ headerShown: false }}
      />

      {/* Profile (deep-link from community) */}
      <CommunityStack.Screen
        name="Profile"
        component={ProfileScreen}
        options={{ headerShown: false }}
      />
    </CommunityStack.Navigator>
  );
}

function ProfileNavigator() {
  return (
    <ProfileStack.Navigator screenOptions={defaultScreenOptions}>
      <ProfileStack.Screen
        name="ProfileHome"
        component={ProfileScreen}
        options={{ headerShown: false }}
      />
    </ProfileStack.Navigator>
  );
}

export default function AppNavigator() {
  const { t } = useLanguage();
  return (
    <NavigationContainer>
      <Tab.Navigator
        tabBar={(props) => <ImmersiveTabBar {...props} />}
        screenOptions={{ headerShown: false }}
      >
        <Tab.Screen
          name="AgriStore"
          component={AgriStoreNavigator}
          options={{
            tabBarLabel: t('tabShop'),
            tabBarIcon: ({ focused, color }) => (
              <Ionicons name={focused ? 'storefront' : 'storefront-outline'} size={25} color={color} />
            ),
          }}
        />
        <Tab.Screen
          name="AnimalTrade"
          component={AnimalTradeNavigator}
          options={{
            tabBarLabel: t('tabAnimals'),
            tabBarIcon: ({ focused, color }) => (
              <Ionicons name={focused ? 'paw' : 'paw-outline'} size={25} color={color} />
            ),
          }}
        />
        <Tab.Screen
          name="Rent"
          component={RentNavigator}
          options={{
            tabBarLabel: t('tabRent'),
            tabBarIcon: ({ focused, color }) => (
              <Ionicons name={focused ? 'construct' : 'construct-outline'} size={25} color={color} />
            ),
          }}
        />
        <Tab.Screen
          name="Weather"
          component={WeatherNavigator}
          options={{
            tabBarLabel: t('tabWeather'),
            tabBarIcon: ({ focused, color }) => (
              <Ionicons name={focused ? 'partly-sunny' : 'partly-sunny-outline'} size={25} color={color} />
            ),
          }}
        />
        <Tab.Screen
          name="Community"
          component={CommunityNavigator}
          options={{
            tabBarLabel: t('tabCommunity'),
            tabBarIcon: ({ focused, color }) => (
              <Ionicons name={focused ? 'people' : 'people-outline'} size={25} color={color} />
            ),
          }}
        />
        <Tab.Screen
          name="Account"
          component={ProfileNavigator}
          options={{
            tabBarLabel: 'Account',
            tabBarIcon: ({ focused, color }) => (
              <Ionicons name={focused ? 'person-circle' : 'person-circle-outline'} size={25} color={color} />
            ),
          }}
        />
      </Tab.Navigator>
    </NavigationContainer>
  );
}
