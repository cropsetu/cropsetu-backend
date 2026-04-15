import { Platform, View, Text, TouchableOpacity, StyleSheet, Dimensions, Animated } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { useRef } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useLanguage } from '../context/LanguageContext';

const ACTIVE_COLOR   = '#1A5C2A';
const INACTIVE_COLOR = '#9A9A9A';

const { width: W, height: H } = Dimensions.get('window');

// Scale helper — base design at 390px wide (iPhone 14)
const scale  = (v) => Math.round(v * (W / 390));
// Clamp between min and max
const clamp  = (v, min, max) => Math.min(Math.max(v, min), max);

const ICON_SIZE  = clamp(scale(30), 26, 34);
const LABEL_SIZE = clamp(scale(12.5), 11, 14);
const BAR_H      = Platform.OS === 'ios'
  ? clamp(scale(90), 82, 104)
  : clamp(scale(74), 66, 86);
const PB         = Platform.OS === 'ios' ? clamp(scale(22), 18, 30) : clamp(scale(8), 6, 12);
const PT         = clamp(scale(10), 8, 14);

// ── Tab bar ───────────────────────────────────────────────────────────────────
function TabItem({ route, options, focused, onPress }) {
  const sc = useRef(new Animated.Value(1)).current;

  const handlePress = () => {
    Animated.sequence([
      Animated.spring(sc, { toValue: 0.82, useNativeDriver: true, tension: 260, friction: 8 }),
      Animated.spring(sc, { toValue: 1,    useNativeDriver: true, tension: 160, friction: 6 }),
    ]).start();
    onPress();
  };

  const iconMap = {
    AgriStore:   focused ? 'storefront'      : 'storefront-outline',
    AIAssistant: focused ? 'hardware-chip'   : 'hardware-chip-outline',
    AnimalTrade: focused ? 'paw'             : 'paw-outline',
    Rent:        focused ? 'construct'       : 'construct-outline',
    Doctor:      focused ? 'medkit'          : 'medkit-outline',
    Account:     focused ? 'person-circle'   : 'person-circle-outline',
  };

  return (
    <TouchableOpacity
      style={TB.tab}
      activeOpacity={1}
      onPress={handlePress}
    >
      <Animated.View style={[TB.tabInner, { transform: [{ scale: sc }] }]}>
        {/* Active pill background behind icon */}
        {focused && <View style={TB.activePill} />}
        <Ionicons
          name={iconMap[route.name] || 'ellipse'}
          size={ICON_SIZE}
          color={focused ? ACTIVE_COLOR : INACTIVE_COLOR}
        />
        <Text
          style={[TB.label, { color: focused ? ACTIVE_COLOR : INACTIVE_COLOR, fontSize: LABEL_SIZE }]}
          numberOfLines={1}
        >
          {options.tabBarLabel ?? route.name}
        </Text>
      </Animated.View>
    </TouchableOpacity>
  );
}

function ImmersiveTabBar({ state, descriptors, navigation }) {
  const insets = useSafeAreaInsets();
  const onPress = (route, isFocused) => {
    const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
    if (!isFocused && !event.defaultPrevented) navigation.navigate(route.name);
  };

  // On Android with gesture nav the bottom inset is 0; with 3-button nav it may
  // also be 0. Either way we add a minimum 8px so the bar never sits flush on
  // the very bottom edge of the screen.
  const bottomPad = Math.max(insets.bottom, Platform.OS === 'android' ? 8 : PB);

  return (
    <View style={[TB.bar, { paddingBottom: bottomPad, paddingTop: PT }]}>
      {state.routes.map((route, index) => {
        const { options } = descriptors[route.key];
        const focused = state.index === index;
        return (
          <TabItem
            key={route.key}
            route={route}
            options={options}
            focused={focused}
            onPress={() => onPress(route, focused)}
          />
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
    borderTopColor: '#EBEBEB',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: -2 },
    elevation: 10,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabInner: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: clamp(scale(4), 3, 6),
    position: 'relative',
    paddingHorizontal: clamp(scale(5), 3, 8),
    paddingVertical: clamp(scale(4), 3, 7),
  },
  activePill: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: ACTIVE_COLOR + '12',
    borderRadius: 14,
  },
  label: {
    fontWeight: '600',
    textAlign: 'center',
  },
});

// ── Screen imports ────────────────────────────────────────────────────────────

// Agri Store
import AgriStoreHome        from '../screens/AgriStore/AgriStoreHome';
import ProductDetail        from '../screens/AgriStore/ProductDetail';
import CartScreen           from '../screens/AgriStore/CartScreen';
import CheckoutScreen       from '../screens/AgriStore/CheckoutScreen';
import OrderConfirmedScreen from '../screens/AgriStore/OrderConfirmedScreen';

// AI Assistant
import AIAssistantHome      from '../screens/AI/AIAssistantHome';
import AIChatScreen         from '../screens/AI/AIChatScreen';
import CropScanScreen       from '../screens/AI/CropScanScreen';
import DiagnosisResultScreen from '../screens/AI/DiagnosisResultScreen';
import MarketScreen         from '../screens/AI/MarketScreen';
import SchemeScreen         from '../screens/AI/SchemeScreen';
import DailyPlannerScreen   from '../screens/AI/DailyPlannerScreen';
// New AI services
import MSPTrackerScreen      from '../screens/AI/MSPTrackerScreen';
import SoilHealthScreen      from '../screens/AI/SoilHealthScreen';
import PestAlertsScreen      from '../screens/AI/PestAlertsScreen';
import FarmCalendarScreen    from '../screens/AI/FarmCalendarScreen';
import IrrigationScreen      from '../screens/AI/IrrigationScreen';
import InputCalculatorScreen from '../screens/AI/InputCalculatorScreen';

// Animal Trade
import AnimalTradeHome  from '../screens/AnimalTrade/AnimalTradeHome';
import AnimalDetail     from '../screens/AnimalTrade/AnimalDetail';
import AddAnimalListing from '../screens/AnimalTrade/AddAnimalListing';
import ChatScreen       from '../screens/AnimalTrade/ChatScreen';

// Rent
import RentHome           from '../screens/Rent/RentHome';
import MachineryDetail    from '../screens/Rent/MachineryDetail';
import LabourDetail       from '../screens/Rent/LabourDetail';
import AddMachineryScreen from '../screens/Rent/AddMachineryScreen';
import AddWorkerScreen    from '../screens/Rent/AddWorkerScreen';
import RentBookingsScreen from '../screens/Rent/RentBookingsScreen';

// Weather
import WeatherHome      from '../screens/Weather/WeatherHome';
import CropCalendar     from '../screens/Weather/CropCalendar';
import CropDetail       from '../screens/Weather/CropDetail';
import StateCropsScreen from '../screens/Weather/StateCropsScreen';

// Doctor (Pashu Sewa — Vet Listings)
import DoctorHome           from '../screens/Doctor/DoctorHome';
import DoctorDetail         from '../screens/Doctor/DoctorDetail';

// Profile
import ProfileScreen           from '../screens/Profile/ProfileScreen';
import MyRentListingsScreen    from '../screens/Rent/MyRentListingsScreen';
import MyOrdersScreen          from '../screens/Profile/MyOrdersScreen';
import SavedPostsScreen        from '../screens/Profile/SavedPostsScreen';
import MyAnimalListingsScreen  from '../screens/Profile/MyAnimalListingsScreen';

// Seller Portal (integrated)
import SellerDashboard      from '../screens/Seller/DashboardScreen';
import SellerMyProducts     from '../screens/Seller/MyProductsScreen';
import SellerAddProduct     from '../screens/Seller/AddProductScreen';
import SellerOrders         from '../screens/Seller/OrdersScreen';
import SellerProfile        from '../screens/Seller/SellerProfileScreen';
import SellerBusiness       from '../screens/Seller/BusinessProfileScreen';

// ── Navigators ────────────────────────────────────────────────────────────────
const Tab           = createBottomTabNavigator();
const AgriStack     = createStackNavigator();
const AIStack       = createStackNavigator();
const AnimalStack   = createStackNavigator();
const RentStack     = createStackNavigator();
const DoctorStack   = createStackNavigator();
const ProfileStack  = createStackNavigator();
const SellerStack   = createStackNavigator();

const defaultScreenOptions = {
  headerStyle: { backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.08)' },
  headerTintColor: '#1E293B',
  headerTitleStyle: { fontWeight: '700', fontSize: 17, color: '#1E293B' },
  headerBackTitleVisible: false,
};

const aiScreenOptions = {
  headerStyle: { backgroundColor: '#0A140A', borderBottomWidth: 1, borderBottomColor: 'rgba(46,204,113,0.15)' },
  headerTintColor: '#2ECC71',
  headerTitleStyle: { fontWeight: '700', fontSize: 17, color: '#F1F1EE' },
  headerBackTitleVisible: false,
};

function AgriStoreNavigator() {
  return (
    <AgriStack.Navigator screenOptions={defaultScreenOptions}>
      <AgriStack.Screen name="AgriStoreHome"  component={AgriStoreHome}        options={{ headerShown: false }} />
      <AgriStack.Screen name="ProductDetail"  component={ProductDetail}        options={{ headerShown: false }} />
      <AgriStack.Screen name="Cart"           component={CartScreen}           options={{ headerShown: false }} />
      <AgriStack.Screen name="Checkout"       component={CheckoutScreen}       options={{ headerShown: false }} />
      <AgriStack.Screen name="OrderConfirmed" component={OrderConfirmedScreen} options={{ title: 'Order Confirmed', headerShown: false }} />
    </AgriStack.Navigator>
  );
}

function AINavigator() {
  return (
    <AIStack.Navigator screenOptions={aiScreenOptions}>
      <AIStack.Screen name="AIAssistantHome"   component={AIAssistantHome}        options={{ headerShown: false }} />
      <AIStack.Screen name="AIChat"            component={AIChatScreen}           options={{ headerShown: false }} />
      <AIStack.Screen name="CropScan"          component={CropScanScreen}         options={{ headerShown: false }} />
      <AIStack.Screen name="DiagnosisResult"   component={DiagnosisResultScreen}  options={{ headerShown: false }} />
      <AIStack.Screen name="Market"            component={MarketScreen}           options={{ headerShown: false }} />
      <AIStack.Screen name="Scheme"            component={SchemeScreen}           options={{ headerShown: false }} />
      <AIStack.Screen name="DailyPlanner"      component={DailyPlannerScreen}     options={{ headerShown: false }} />
      {/* New AI services */}
      <AIStack.Screen name="MSPTracker"        component={MSPTrackerScreen}       options={{ headerShown: false }} />
      <AIStack.Screen name="SoilHealth"        component={SoilHealthScreen}       options={{ headerShown: false }} />
      <AIStack.Screen name="PestAlerts"        component={PestAlertsScreen}       options={{ headerShown: false }} />
      <AIStack.Screen name="FarmCalendar"      component={FarmCalendarScreen}     options={{ headerShown: false }} />
      <AIStack.Screen name="Irrigation"        component={IrrigationScreen}       options={{ headerShown: false }} />
      <AIStack.Screen name="InputCalculator"   component={InputCalculatorScreen}  options={{ headerShown: false }} />
      {/* Weather screens — accessible from AI tab */}
      <AIStack.Screen name="Weather"           component={WeatherHome}            options={{ headerShown: false }} />
      <AIStack.Screen name="CropCalendar"      component={CropCalendar}           options={{ title: 'Crop Calendar' }} />
      <AIStack.Screen name="CropDetail"        component={CropDetail}             options={({ route }) => ({ title: route.params?.cropName || 'Crop Details' })} />
      <AIStack.Screen name="StateCrops"        component={StateCropsScreen}       options={{ headerShown: false }} />
    </AIStack.Navigator>
  );
}

function AnimalTradeNavigator() {
  return (
    <AnimalStack.Navigator screenOptions={defaultScreenOptions}>
      <AnimalStack.Screen name="AnimalTradeHome"  component={AnimalTradeHome}  options={{ headerShown: false }} />
      <AnimalStack.Screen name="AnimalDetail"     component={AnimalDetail}     options={{ title: 'Animal Details' }} />
      <AnimalStack.Screen name="AddAnimalListing" component={AddAnimalListing} options={{ title: 'Sell Your Animal' }} />
      <AnimalStack.Screen name="Chat"             component={ChatScreen}       options={({ route }) => ({ title: route.params?.sellerName || 'Chat' })} />
    </AnimalStack.Navigator>
  );
}

function RentNavigator() {
  return (
    <RentStack.Navigator screenOptions={defaultScreenOptions}>
      <RentStack.Screen name="RentHome"        component={RentHome}           options={{ headerShown: false }} />
      <RentStack.Screen name="MachineryDetail" component={MachineryDetail}    options={{ headerShown: false }} />
      <RentStack.Screen name="LabourDetail"    component={LabourDetail}       options={{ headerShown: false }} />
      <RentStack.Screen name="AddMachinery"    component={AddMachineryScreen} options={{ headerShown: false }} />
      <RentStack.Screen name="AddWorker"       component={AddWorkerScreen}    options={{ headerShown: false }} />
      <RentStack.Screen name="RentBookings"    component={RentBookingsScreen} options={{ headerShown: false }} />
    </RentStack.Navigator>
  );
}

function DoctorNavigator() {
  return (
    <DoctorStack.Navigator screenOptions={defaultScreenOptions}>
      <DoctorStack.Screen name="DoctorHome"   component={DoctorHome}   options={{ headerShown: false }} />
      <DoctorStack.Screen name="DoctorDetail" component={DoctorDetail} options={{ headerShown: false }} />
    </DoctorStack.Navigator>
  );
}

function SellerNavigator() {
  return (
    <SellerStack.Navigator screenOptions={{
      headerStyle: { backgroundColor: '#E65100' },
      headerTintColor: '#fff',
      headerTitleStyle: { fontWeight: '700', fontSize: 17 },
      headerBackTitleVisible: false,
    }}>
      <SellerStack.Screen name="SellerDashboard"    component={SellerDashboard}  options={{ headerShown: false }} />
      <SellerStack.Screen name="SellerMyProducts"   component={SellerMyProducts} options={{ title: 'My Products' }} />
      <SellerStack.Screen name="AddProduct"         component={SellerAddProduct} options={{ title: 'List a Product' }} />
      <SellerStack.Screen name="SellerOrders"       component={SellerOrders}     options={{ title: 'Orders' }} />
      <SellerStack.Screen name="SellerProfile"      component={SellerProfile}    options={{ headerShown: false }} />
      <SellerStack.Screen name="BusinessProfile"    component={SellerBusiness}   options={{ title: 'Business Profile & KYC' }} />
    </SellerStack.Navigator>
  );
}

function ProfileNavigator() {
  return (
    <ProfileStack.Navigator screenOptions={defaultScreenOptions}>
      <ProfileStack.Screen name="ProfileHome"         component={ProfileScreen}           options={{ headerShown: false }} />
      <ProfileStack.Screen name="MyRentListings"      component={MyRentListingsScreen}    options={{ headerShown: false }} />
      <ProfileStack.Screen name="SellerPortal"        component={SellerNavigator}         options={{ headerShown: false }} />
      <ProfileStack.Screen name="MyOrders"            component={MyOrdersScreen}          options={{ headerShown: false }} />
      <ProfileStack.Screen name="SavedPosts"          component={SavedPostsScreen}        options={{ headerShown: false }} />
      <ProfileStack.Screen name="MyAnimalListings"    component={MyAnimalListingsScreen}  options={{ headerShown: false }} />
    </ProfileStack.Navigator>
  );
}

// ── Root navigator ────────────────────────────────────────────────────────────
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
          options={{ tabBarLabel: t('tabShop') }}
        />
        <Tab.Screen
          name="AIAssistant"
          component={AINavigator}
          options={{ tabBarLabel: 'AI' }}
        />
        <Tab.Screen
          name="AnimalTrade"
          component={AnimalTradeNavigator}
          options={{ tabBarLabel: t('tabAnimals') }}
        />
        <Tab.Screen
          name="Rent"
          component={RentNavigator}
          options={{ tabBarLabel: t('tabRent') }}
        />
        <Tab.Screen
          name="Doctor"
          component={DoctorNavigator}
          options={{ tabBarLabel: 'Doctor' }}
        />
        <Tab.Screen
          name="Account"
          component={ProfileNavigator}
          options={{ tabBarLabel: t('tabAccount') }}
        />
      </Tab.Navigator>
    </NavigationContainer>
  );
}
