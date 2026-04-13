import React, { useState, useEffect, useContext } from 'react';
import {
  Container,
  Typography,
  Grid,
  Card,
  CardContent,
  Button,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  TextField,
  Box,
  Avatar,
  Chip,
  Divider,
  Tabs,
  Tab,
  InputAdornment,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from "../ui/primitives";
import {
  DashboardIcon,
  ShoppingCartIcon,
  DownloadIcon,
  VisibilityIcon,
  CheckCircleIcon,
  CreditCardIcon,
  TrendingUpIcon,
  DataUsageIcon,
  SearchIcon,
  ClearIcon,
  LogoutIcon,
  AddIcon,
  WalletIcon,
  AssignmentIcon,
  GetAppIcon,
  RefreshIcon,
  PersonIcon,
  EditIcon,
} from "../ui/icons";
import * as XLSX from 'xlsx';
import { AuthContext } from '../context/AuthContext';
import { dataAPI, purchaseAPI, userAPI } from '../services/api';
import { toast } from "react-hot-toast";

const UserDashboard = () => {
  const formatLocalISODate = (input) => {
    const d = new Date(input);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  };

  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [preview, setPreview] = useState([]);
  const [requests, setRequests] = useState([]);
  const [purchased, setPurchased] = useState([]);
  const [error, setErrorState] = useState('');
  const [success, setSuccessState] = useState('');
  const [errorToastTick, setErrorToastTick] = useState(0);
  const [successToastTick, setSuccessToastTick] = useState(0);
  const setError = (message) => {
    setErrorState(message || '');
    if (message) setErrorToastTick((tick) => tick + 1);
  };
  const setSuccess = (message) => {
    setSuccessState(message || '');
    if (message) setSuccessToastTick((tick) => tick + 1);
  };
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [activeTab, setActiveTab] = useState(0);
  const [profile, setProfile] = useState({});
  const [isEditing, setIsEditing] = useState(false);
  const [selectedWeek, setSelectedWeek] = useState({ startDate: '', endDate: '' });

  const [dailyQuantity, setDailyQuantity] = useState(0);
  const [weekDialogOpen, setWeekDialogOpen] = useState(false);
  const [selectedCategoryForWeek, setSelectedCategoryForWeek] = useState('');
  const [reorderDialogOpen, setReorderDialogOpen] = useState(false);
  const [completedDeliveries, setCompletedDeliveries] = useState([]);
  const [dailyQuantities, setDailyQuantities] = useState({ mon: 0, tue: 0, wed: 0, thu: 0, fri: 0 });
  const [hasShownReorderDialog, setHasShownReorderDialog] = useState(false);
  const [confirmationDialogOpen, setConfirmationDialogOpen] = useState(false);
  const [selectedWeekOption, setSelectedWeekOption] = useState('');
  const { user, logout } = useContext(AuthContext);
  
  const [dailyRequirementsState, setDailyRequirementsState] = useState({});
  const [dailyRequirementsDates, setDailyRequirementsDates] = useState({});
  const [downloadedButtons, setDownloadedButtons] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('downloadedButtons') || '{}');
    } catch (e) {
      return {};
    }
  });
  const [requestDayAvailability, setRequestDayAvailability] = useState({});
  const [downloadingDayKeys, setDownloadingDayKeys] = useState({});

  const generateWeekOptions = () => {
    const options = [];
    const today = new Date();
    let currentMonday = new Date(today);

    // Find the next Monday
    const dayOfWeek = today.getDay(); // 0 = Sunday, 1 = Monday, etc.
    const daysUntilMonday = dayOfWeek === 0 ? 1 : (8 - dayOfWeek) % 7;
    currentMonday.setDate(today.getDate() + daysUntilMonday);

    for (let i = 0; i < 6; i++) {
      const monday = new Date(currentMonday);
      monday.setDate(currentMonday.getDate() + (i * 7));

      const friday = new Date(monday);
      friday.setDate(monday.getDate() + 4);

      const mondayStr = formatLocalISODate(monday);
      const fridayStr = formatLocalISODate(friday);

      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const mondayDate = monday.getDate();
      const fridayDate = friday.getDate();
      const month = monthNames[monday.getMonth()];
      const year = monday.getFullYear();

      const label = `${month} ${mondayDate}-${fridayDate}, ${year}`;

      options.push({
        label,
        startDate: mondayStr,
        endDate: fridayStr,
        value: `${mondayStr}_${fridayStr}`
      });
    }

    return options;
  };

  const weekOptions = generateWeekOptions();

  useEffect(() => {
    loadCategories();
    loadRequests();
    loadPurchased();
    loadProfile();
    loadDailyRequirements();
    checkForReorderNotification();
  }, []);

  // Keep request status in sync without manual refresh (admin may approve in another session)
  useEffect(() => {
    const interval = setInterval(() => {
      loadRequests();
      if (activeTab === 3) loadPurchased();
    }, 15000);
    return () => clearInterval(interval);
  }, [activeTab]);

  useEffect(() => {
    const onFocus = () => {
      loadRequests();
      if (activeTab === 3) loadPurchased();
    };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onFocus);
    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onFocus);
    };
  }, [activeTab]);

  useEffect(() => {
    if (activeTab === 3) {
      loadPurchased();
    }
  }, [activeTab]);

  useEffect(() => {
    if (!error) return;
    toast.error(error);
  }, [error, errorToastTick]);

  useEffect(() => {
    if (!success) return;
    toast.success(success);
  }, [success, successToastTick]);

  const loadDailyRequirements = async (startDate, endDate) => {
    try {
      const params = {};
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;
      const res = await dataAPI.getDailyRequirements(Object.keys(params).length ? params : undefined);
      setDailyRequirementsState(res.data.requirements || {});
      setDailyRequirementsDates(res.data.dates || {});
    } catch (err) {
      console.error('Failed to load daily requirements:', err);
      // not fatal for users
    }
  };

  // When user selects a week, refresh daily requirements for that range
  useEffect(() => {
    if (selectedWeek.startDate && selectedWeek.endDate) {
      loadDailyRequirements(selectedWeek.startDate, selectedWeek.endDate);
    }
  }, [selectedWeek]);

  const loadCategories = async () => {
    try {
      const response = await dataAPI.getCategories();
      // Ensure response.data is an array before processing
      const rawData = Array.isArray(response.data) ? response.data : [];
      
      // Normalize categories to a consistent shape: { id, name, count }
      const cats = rawData.map(c => ({
        id: c.id || c._id || null,
        name: c.name || c._id || c.category || String(c),
        count: c.count || 0
      }));
      
      setCategories(cats);
    } catch (err) {
      console.error('Failed to load categories:', err);
      setError('Failed to load categories');
      // Ensure categories remains an array even on error
      setCategories([]);
    }
  };

  const loadRequests = async () => {
    try {
      const response = await purchaseAPI.getRequests();
      const requestsData = Array.isArray(response.data) ? response.data : [];
      setRequests(requestsData);
      // After loading requests, pre-fetch availability for each request's delivery days
      fetchRequestsAvailability(requestsData);
    } catch (err) {
      console.error('Failed to load requests:', err);
      setError('Failed to load requests');
      setRequests([]);
    }
  };

  // Prefetch whether uploaded data exists for each request/day so buttons can be enabled
  const fetchRequestsAvailability = async (requestsList) => {
    if (!Array.isArray(requestsList)) return;
    const next = { ...requestDayAvailability };

    const promises = [];
    requestsList.forEach((req) => {
      if (req.status !== 'approved' || !req.weekRange) return;
      const requestCategory = req?.category || req?.purchaseRequest?.category || '';
      ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'].forEach((day, idx) => {
        const qty = req.dailyQuantities?.[day] || 0;
        if (!qty) return;
        const key = `${req._id}-${day}`;

        // compute ISO date for this day based on request.weekRange.startDate
        try {
          const start = new Date(req.weekRange.startDate);
          const target = new Date(start);
          target.setDate(start.getDate() + idx);
          const iso = formatLocalISODate(target);

          // push a promise to probe the endpoint. We won't fail the whole flow on error.
          const p = dataAPI.getDailyUploadedData(requestCategory, day, iso)
            .then((resp) => {
              const uploadedData = Array.isArray(resp?.data?.uploadedData)
                ? resp.data.uploadedData
                : [];
              next[key] = uploadedData.length > 0;
            })
            .catch(() => { next[key] = false; });
          promises.push(p);
        } catch (e) {
          next[key] = false;
        }
      });
    });

    try {
      await Promise.all(promises);
      setRequestDayAvailability(next);
    } catch (e) {
      console.error('Failed to fetch request availability:', e);
      // ignore - individual promises set availability
    }
  };

  const loadPurchased = async () => {
    try {
      const response = await purchaseAPI.getPurchased();
      const purchasedData = Array.isArray(response.data) ? response.data : [];
      setPurchased(purchasedData);
    } catch (err) {
      console.error('Failed to load purchased data:', err);
      setError('Failed to load purchased data');
      setPurchased([]);
    }
  };

  const loadProfile = async () => {
    try {
      const response = await userAPI.getProfile();
      const userData = response.data;
      setProfile({
        email: userData.email || '',
        firstName: userData.profile?.firstName || '',
        lastName: userData.profile?.lastName || '',
        company: userData.profile?.company || '',
        phone: userData.profile?.phone || '',
        address: {
          street: userData.profile?.address?.street || '',
          city: userData.profile?.address?.city || '',
          state: userData.profile?.address?.state || '',
          zipCode: userData.profile?.address?.zipCode || '',
          country: userData.profile?.address?.country || ''
        }
      });
    } catch (err) {
      console.error('Failed to load profile:', err);
      setError('Failed to load profile');
    }
  };

  const refreshAll = async () => {
    await Promise.all([loadCategories(), loadRequests(), loadPurchased(), loadProfile()]);
    if (selectedWeek.startDate && selectedWeek.endDate) {
      loadDailyRequirements(selectedWeek.startDate, selectedWeek.endDate);
    }
    toast.success("Workspace refreshed.");
  };

  const getPreviousFriday = () => {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const daysSinceFriday = (dayOfWeek + 2) % 7; // Calculate days back to previous Friday
    const previousFriday = new Date(today);
    previousFriday.setDate(today.getDate() - daysSinceFriday);
    previousFriday.setHours(0, 0, 0, 0);
    return previousFriday;
  };

  const checkForReorderNotification = () => {
    // Simple check: if there are purchased items and today is after Friday, show reorder dialog
    const today = new Date();
    const dayOfWeek = today.getDay(); // 0 = Sunday, 1 = Monday, ..., 5 = Friday
    if (purchased.length > 0 && dayOfWeek >= 1 && dayOfWeek <= 5 && !hasShownReorderDialog) {
      // Assuming weekly deliveries, check if it's time for reorder
      // For simplicity, show if there are purchases and it's a weekday
      setReorderDialogOpen(true);
      setHasShownReorderDialog(true);
    }
  };

  const handleSaveProfile = async () => {
    try {
      const profileData = {};
      if (profile.firstName) profileData.firstName = profile.firstName;
      if (profile.lastName) profileData.lastName = profile.lastName;
      if (profile.company) profileData.company = profile.company;
      if (profile.phone) profileData.phone = profile.phone;

      const address = {};
      if (profile.address?.street) address.street = profile.address.street;
      if (profile.address?.city) address.city = profile.address.city;
      if (profile.address?.state) address.state = profile.address.state;
      if (profile.address?.zipCode) address.zipCode = profile.address.zipCode;
      if (profile.address?.country) address.country = profile.address.country;

      if (Object.keys(address).length > 0) {
        profileData.address = address;
      }

      await userAPI.updateProfile({ profile: profileData });
      setSuccess('Profile updated successfully');
      setIsEditing(false);
      loadProfile(); // Reload profile to reflect changes
    } catch (err) {
      console.error('Failed to update profile:', err);
      setError('Failed to update profile');
    }
  };

  const handleCategoryChange = async (category) => {
    setSelectedCategory(category);
    try {
      const response = await dataAPI.getPreview(category);
      setPreview(response.data);
    } catch (err) {
      console.error('Failed to load preview:', err);
      setError('Failed to load preview');
    }
  };

  const handlePurchaseRequest = async () => {
    if (!selectedCategory) {
      setError('Please select a category');
      return;
    }

    try {
      const res = await purchaseAPI.createRequest({ category: selectedCategory, quantity });
      const available = res.data?.availableCount;
      if (available === 0) {
        setSuccess('Purchase request submitted and queued - admin has not uploaded data yet');
      } else {
        setSuccess('Purchase request submitted successfully');
      }
      loadRequests();
    } catch (err) {
      console.error('Failed to submit request:', err);
      setError(err.response?.data?.message || 'Failed to submit request');
    }
  };

  const handlePayment = async (requestId) => {
    try {
      // Directly mark payment as successful (skip payment gateway for now)
      await purchaseAPI.confirmPayment({
        requestId: requestId,
        paymentId: `demo_${Date.now()}`, // Demo payment ID
        signature: 'demo_signature', // Demo signature
      });
      setSuccess('Payment successful! Data has been added to your account.');
      loadRequests();
      loadPurchased();
    } catch (err) {
      console.error('Payment processing failed:', err);
      setError('Payment processing failed');
    }
  };

  const handleWeeklyPurchaseRequest = async () => {
    if (!selectedCategoryForWeek || !selectedWeek.startDate || !selectedWeek.endDate) {
      setError('Please select a category and week range');
      return;
    }

    const totalQuantity = Object.values(dailyQuantities).reduce((sum, qty) => sum + qty, 0);
    if (totalQuantity === 0) {
      setError('Please specify quantities for at least one day');
      return;
    }

    try {
      const res = await purchaseAPI.createRequest({
        category: selectedCategoryForWeek,
        quantity: totalQuantity,
        weekRange: {
          startDate: selectedWeek.startDate,
          endDate: selectedWeek.endDate
        },
        dailyQuantities: {
          monday: dailyQuantities.mon,
          tuesday: dailyQuantities.tue,
          wednesday: dailyQuantities.wed,
          thursday: dailyQuantities.thu,
          friday: dailyQuantities.fri
        }
      });
      const available = res.data?.availableCount;
      if (available === 0) {
        setSuccess('Weekly purchase request submitted and queued - admin has not uploaded data yet');
      } else {
        setSuccess('Weekly purchase request submitted successfully');
      }
      loadRequests();
      // Reset form
      setSelectedWeek({ startDate: '', endDate: '' });
      setDailyQuantities({ mon: 0, tue: 0, wed: 0, thu: 0, fri: 0 });
      setSelectedCategoryForWeek('');
      setSelectedWeekOption('');
    } catch (err) {
      console.error('Failed to submit weekly request:', err);
      setError(err.response?.data?.message || 'Failed to submit weekly request');
    }
  };

  const handleDownloadData = (purchase) => {
    try {
      // Prepare data for Excel export - use original metadata format
      const data = purchase.dataItems.map(item => ({
        ...item.metadata, // Spread original row data
        Index: item.index
      }));

      // Create worksheet
      const ws = XLSX.utils.json_to_sheet(data);

      // Create workbook
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Purchased Data');

      // Generate Excel file and download
      XLSX.writeFile(wb, `purchased_data_${purchase._id.slice(-6)}.xlsx`);
      setSuccess('Data downloaded successfully');
    } catch (err) {
      console.error('Failed to download data:', err);
      setError('Failed to download data');
    }
  };

  // Filter functions with safety checks
  const toTitleCase = (value) =>
    String(value)
      .toLowerCase()
      .split(" ")
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ");

  const getRequestCategoryLabel = (req) => {
    const raw =
      req?.category ||
      req?.purchaseRequest?.category ||
      req?.dataItems?.[0]?.category ||
      "";
    const normalized = String(raw).trim();
    return normalized ? toTitleCase(normalized) : "—";
  };

  const getRequestQuantity = (req) =>
    Number(req?.quantity ?? req?.totalQuantity ?? 0);

  const filteredRequests = Array.isArray(requests) ? requests.filter(req => {
    const categoryLabel = getRequestCategoryLabel(req).toLowerCase();
    const matchesSearch = categoryLabel.includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || req.status === statusFilter;
    const matchesDate = dateFilter === 'all' || (() => {
      const reqDate = new Date(req.createdAt);
      const now = new Date();
      const diffTime = Math.abs(now - reqDate);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      if (dateFilter === 'today') return diffDays <= 1;
      if (dateFilter === 'week') return diffDays <= 7;
      if (dateFilter === 'month') return diffDays <= 30;
      return true;
    })();
    return matchesSearch && matchesStatus && matchesDate;
  }) : [];

  const filteredPurchased = Array.isArray(purchased) ? purchased.filter(purchase => {
    const matchesSearch = Array.isArray(purchase.dataItems) && purchase.dataItems.some(item =>
      item.category && item.category.toLowerCase().includes(searchTerm.toLowerCase())
    );
    const matchesDate = dateFilter === 'all' || (() => {
      const purchaseDate = new Date(purchase.purchasedAt);
      const now = new Date();
      const diffTime = Math.abs(now - purchaseDate);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      if (dateFilter === 'today') return diffDays <= 1;
      if (dateFilter === 'week') return diffDays <= 7;
      if (dateFilter === 'month') return diffDays <= 30;
      return true;
    })();
    return matchesSearch && matchesDate;
  }) : [];

  const uniqueCategories = (Array.isArray(categories) ? categories : []).filter((category, index, list) => {
    const currentName = (category?.name || "").trim().toLowerCase();
    if (!currentName) return false;
    return list.findIndex((item) => (item?.name || "").trim().toLowerCase() === currentName) === index;
  });

  const userDisplayName = [
    profile?.firstName?.trim(),
    profile?.lastName?.trim(),
  ]
    .filter(Boolean)
    .join(" ")
    || user?.email?.split("@")[0]
    || "User";

  const isProfileViewCardMode = !isEditing && Boolean(profile?.firstName);
  const profileAddressLine = [
    profile.address?.street,
    [profile.address?.city, profile.address?.state, profile.address?.zipCode].filter(Boolean).join(", "),
    profile.address?.country,
  ]
    .filter(Boolean)
    .join(" | ");
  const profileAddressLines = [
    profile.address?.street,
    [profile.address?.city, profile.address?.state, profile.address?.zipCode].filter(Boolean).join(", "),
    profile.address?.country,
  ].filter(Boolean);

  const getCategoryEmoji = (categoryName) => {
    const key = (categoryName || "").toLowerCase();
    if (key.includes("vehicle") || key.includes("car")) return "🚚";
    if (key.includes("food")) return "🍽️";
    if (key.includes("tea")) return "🫖";
    if (key.includes("fruit")) return "🍎";
    if (key.includes("medicine")) return "💊";
    return "📦";
  };

  const clearFilters = () => {
    setSearchTerm('');
    setStatusFilter('all');
    setDateFilter('all');
  };

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  return (
    <div className="crm-page">
      <section className="crm-section">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="crm-eyebrow">User Workspace</p>
            <h1 className="crm-title">Welcome back, {userDisplayName}</h1>
            <p className="crm-subtitle">
              Track your purchases, manage data requests, and keep weekly demand aligned.
            </p>
          </div>
          <div className="crm-actions">
            <button className="crm-btn crm-btn-outline crm-btn-sharp" onClick={() => refreshAll()}>
              <RefreshIcon />
              Refresh
            </button>
            <button className="crm-btn crm-btn-primary crm-btn-sharp" onClick={logout}>
              <LogoutIcon />
              Logout
            </button>
          </div>
        </div>

        <Tabs
          value={activeTab}
          onChange={handleTabChange}
          variant="fullWidth"
          className="mt-6"
        >
          <Tab value={0} icon={<DashboardIcon />} label="Dashboard Overview" />
          <Tab value={1} icon={<ShoppingCartIcon />} label="Request Purchase" />
          <Tab
            value={2}
            icon={<CreditCardIcon />}
            label={`Purchase Requests (${filteredRequests.length})`}
          />
          <Tab
            value={3}
            icon={<DownloadIcon />}
            label={`Purchased Data (${filteredPurchased.length})`}
          />
          <Tab value={4} icon={<PersonIcon />} label="Profile" />
        </Tabs>
      </section>

      <Container maxWidth="xl">

        {/* Tabbed Section */}
        <Card className="crm-card">

              {/* Filter Section */}
              {(activeTab === 2 || activeTab === 3) && (
                <CardContent sx={{ p: 3, borderBottom: '1px solid #D7DDF0' }}>
                  <Box className="crm-filter bg-[#f7f8ff]">
                    <TextField
                      size="small"
                      placeholder="Search by category..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <SearchIcon />
                          </InputAdornment>
                        ),
                      }}
                      className="min-w-[220px]"
                      sx={{ minWidth: 220 }}
                    />

                    {activeTab === 2 && (
                      <FormControl size="small" sx={{ minWidth: 120 }}>
                        <InputLabel>Status</InputLabel>
                        <Select
                          value={statusFilter}
                          onChange={(e) => setStatusFilter(e.target.value)}
                          label="Status"
                        >
                          <MenuItem value="all">All Status</MenuItem>
                          <MenuItem value="pending">Pending</MenuItem>
                          <MenuItem value="approved">Approved</MenuItem>
                          <MenuItem value="rejected">Rejected</MenuItem>
                        </Select>
                      </FormControl>
                    )}

                    <FormControl size="small" sx={{ minWidth: 120 }}>
                      <InputLabel>Date</InputLabel>
                      <Select
                        value={dateFilter}
                        onChange={(e) => setDateFilter(e.target.value)}
                        label="Date"
                      >
                        <MenuItem value="all">All Time</MenuItem>
                        <MenuItem value="today">Today</MenuItem>
                        <MenuItem value="week">This Week</MenuItem>
                        <MenuItem value="month">This Month</MenuItem>
                      </Select>
                    </FormControl>

                    <Button
                      variant="outlined"
                      size="small"
                      onClick={clearFilters}
                      startIcon={<ClearIcon />}
                      className="crm-btn crm-btn-outline crm-btn-sharp border-[#cfc5ff] text-[#6c47d9]"
                    >
                      Clear Filters
                    </Button>
                  </Box>
                </CardContent>
              )}

              {/* Dashboard Tab */}
              {activeTab === 0 && <Box sx={{ p: 3 }}>
                  <div className="mb-4 flex items-start gap-2 text-text-primary">
                    <DashboardIcon />
                    <div>
                      <p className="text-base font-semibold">Dashboard Overview</p>
                      <p className="text-xs text-text-secondary">
                        Snapshot of your requests, purchases, and quick actions.
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                    <Card className="rounded-xl border border-[#d9d5ff] bg-[#f0eeff] shadow-sm">
                      <CardContent className="px-5 py-4">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="text-3xl font-bold text-[#1a1a2e]">{requests.length}</p>
                            <p className="mt-1 text-sm text-[#6b7280]">Total Requests</p>
                          </div>
                          <span className="rounded-lg bg-white/80 p-2 text-[#6c47d9]"><AssignmentIcon /></span>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="rounded-xl border border-[#d9d5ff] bg-[#f0eeff] shadow-sm">
                      <CardContent className="px-5 py-4">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="text-3xl font-bold text-[#1a1a2e]">{purchased.length}</p>
                            <p className="mt-1 text-sm text-[#6b7280]">Purchased Data</p>
                          </div>
                          <span className="rounded-lg bg-white/80 p-2 text-[#6c47d9]"><GetAppIcon /></span>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="rounded-xl border border-[#d9d5ff] bg-[#f0eeff] shadow-sm">
                      <CardContent className="px-5 py-4">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="text-3xl font-bold text-[#1a1a2e]">
                              {purchased.reduce((sum, p) => sum + (Array.isArray(p.dataItems) ? p.dataItems.length : 0), 0)}
                            </p>
                            <p className="mt-1 text-sm text-[#6b7280]">Total Items Purchased</p>
                          </div>
                          <span className="rounded-lg bg-white/80 p-2 text-[#6c47d9]"><WalletIcon /></span>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  <div className="mt-5">
                    <Card className="w-full border border-[#dadcf0] bg-white shadow-sm">
                      <CardContent sx={{ p: 3 }}>
                        <Typography variant="h6" sx={{ mb: 3, fontWeight: 'bold' }}>
                          Quick Actions
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                          <Button
                            variant="contained"
                            size="large"
                            onClick={() => setActiveTab(1)}
                            className="crm-btn crm-btn-primary crm-btn-sharp"
                            startIcon={<AddIcon />}
                            title="Navigate to request data purchase tab"
                          >
                            Request Data Purchase
                          </Button>
                          <Button
                            variant="outlined"
                            size="large"
                            onClick={() => setActiveTab(2)}
                            className="crm-btn crm-btn-outline crm-btn-sharp"
                            startIcon={<AssignmentIcon />}
                            title="Navigate to purchase requests tab"
                          >
                            View Requests
                          </Button>
                          <Button
                            variant="outlined"
                            size="large"
                            onClick={() => setActiveTab(3)}
                            className="crm-btn crm-btn-outline crm-btn-sharp"
                            startIcon={<GetAppIcon />}
                            title="Navigate to purchased data tab"
                          >
                            View Purchased Data
                          </Button>
                        </Box>
                      </CardContent>
                    </Card>
                  </div>
                </Box>
                }

                {/* Request Data Purchase Tab */}
                {activeTab === 1 && <Box sx={{ p: 3 }}>
                  <div className="mb-4 flex items-start gap-2 text-text-primary">
                    <ShoppingCartIcon />
                    <div>
                      <p className="text-base font-semibold">Request Weekly Data Purchase</p>
                      <p className="text-xs text-text-secondary">
                        Select a category and schedule weekday quantities.
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {uniqueCategories.map((category) => (
                      <Card
                        key={category.id || category._id || category.name}
                        className="cursor-pointer rounded-xl border border-[#d9dcef] bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                        onClick={() => {
                          setSelectedCategoryForWeek(category.name);
                          setWeekDialogOpen(true);
                        }}
                      >
                        <CardContent className="p-4">
                          <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-[#f5f4ff] text-xl">
                            {getCategoryEmoji(category.name)}
                          </div>
                          <Typography variant="h6" className="mb-1 font-semibold text-[#1a1a2e]">
                            {category.name}
                          </Typography>
                          <Typography variant="body2" className="mb-4 text-[#6b7280]">
                            Weekly data delivery
                          </Typography>
                          <Button
                            variant="contained"
                            fullWidth
                            className="crm-btn crm-btn-primary crm-btn-sharp w-full"
                            startIcon={<ShoppingCartIcon />}
                          >
                            Order Now
                          </Button>
                        </CardContent>
                      </Card>
                    ))}
                  </div>

                  {/* Week Selection Dialog */}
                  <Dialog
                    open={weekDialogOpen}
                    onClose={() => setWeekDialogOpen(false)}
                    maxWidth="md"
                    fullWidth
                  >
                    <DialogTitle sx={{ fontWeight: 'bold', color: 'primary.main' }}>
                      Select Week Range & Daily Quantities
                    </DialogTitle>
                    <DialogContent>
                      <Typography variant="body1" sx={{ mb: 3 }}>
                        Choose a week for data delivery and specify quantities for each weekday.
                      </Typography>

                      <Grid container spacing={3}>
                        <Grid item xs={12} md={6}>
                          <FormControl fullWidth sx={{ mb: 3 }}>
                            <InputLabel>Select Week</InputLabel>
                            <Select
                              value={selectedWeekOption}
                              onChange={(e) => {
                                const selectedOption = weekOptions.find(option => option.value === e.target.value);
                                if (selectedOption) {
                                  setSelectedWeekOption(e.target.value);
                                  setSelectedWeek({
                                    startDate: selectedOption.startDate,
                                    endDate: selectedOption.endDate
                                  });
                                }
                              }}
                              label="Select Week"
                            >
                              {weekOptions.map((option) => (
                                <MenuItem key={option.value} value={option.value}>
                                  {option.label}
                                </MenuItem>
                              ))}
                            </Select>
                          </FormControl>
                          <TextField
                            fullWidth
                            label="Week Start Date (Monday)"
                            type="date"
                            value={selectedWeek.startDate}
                            InputProps={{ readOnly: true }}
                            InputLabelProps={{ shrink: true }}
                            sx={{ mb: 3 }}
                          />
                          <TextField
                            fullWidth
                            label="Week End Date (Friday)"
                            type="date"
                            value={selectedWeek.endDate}
                            InputProps={{ readOnly: true }}
                            InputLabelProps={{ shrink: true }}
                            sx={{ mb: 3 }}
                          />
                        </Grid>

                        <Grid item xs={12} md={6}>
                          <Typography variant="h6" sx={{ mb: 2, fontWeight: 'bold' }}>
                            Daily Quantity
                          </Typography>
                          <Typography variant="body2" sx={{ mb: 2, color: 'text.secondary' }}>
                            Enter the quantity you want for each day (Monday-Friday)
                          </Typography>
                          <TextField
                            fullWidth
                            label="Quantity per day"
                            type="number"
                            value={dailyQuantity}
                            onChange={(e) => setDailyQuantity(Math.max(0, parseInt(e.target.value) || 0))}
                            InputProps={{ inputProps: { min: 0 } }}
                            sx={{ mb: 2 }}
                          />
                          <Typography variant="body2" color="text.secondary">
                            This quantity will be applied to all weekdays (Mon-Fri)
                          </Typography>
                        </Grid>
                      </Grid>
                    </DialogContent>
                    <DialogActions>
                      <Button onClick={() => setWeekDialogOpen(false)} className="crm-btn crm-btn-ghost crm-btn-sharp">
                        Cancel
                      </Button>
                      <Button
                        variant="contained"
                        onClick={() => {
                          setDailyQuantities({
                            mon: dailyQuantity,
                            tue: dailyQuantity,
                            wed: dailyQuantity,
                            thu: dailyQuantity,
                            fri: dailyQuantity
                          });
                          setWeekDialogOpen(false);
                          setConfirmationDialogOpen(true);
                        }}
                        disabled={!selectedWeek.startDate || dailyQuantity === 0}
                        className="crm-btn crm-btn-success crm-btn-sharp"
                      >
                        Review Order
                      </Button>
                    </DialogActions>
                  </Dialog>

                  {/* Order Confirmation Dialog */}
                  <Dialog
                    open={confirmationDialogOpen}
                    onClose={() => setConfirmationDialogOpen(false)}
                    maxWidth="md"
                    fullWidth
                  >
                    <DialogTitle sx={{ fontWeight: 'bold', color: 'primary.main' }}>
                      Confirm Weekly Data Order
                    </DialogTitle>
                    <DialogContent>
                      <Typography variant="h6" sx={{ mb: 2 }}>
                        Category: {(Array.isArray(categories) ? categories : []).find(c => c.name === selectedCategoryForWeek)?.name || 'Unknown'}
                      </Typography>
                      <Typography variant="body1" sx={{ mb: 3 }}>
                        Week: {selectedWeek.startDate} to {selectedWeek.endDate}
                      </Typography>

                      <TableContainer component={Paper} sx={{ mb: 3 }}>
                        <Table>
                      <TableHead className="crm-thead">
                        <TableRow>
                          <TableCell className="crm-cell-head">Day</TableCell>
                          <TableCell className="crm-cell-head">Quantity</TableCell>
                        </TableRow>
                      </TableHead>
                          <TableBody>
                            {[
                              { key: 'mon', label: 'Monday', qty: dailyQuantities.mon },
                              { key: 'tue', label: 'Tuesday', qty: dailyQuantities.tue },
                              { key: 'wed', label: 'Wednesday', qty: dailyQuantities.wed },
                              { key: 'thu', label: 'Thursday', qty: dailyQuantities.thu },
                              { key: 'fri', label: 'Friday', qty: dailyQuantities.fri }
                            ].map((day) => (
                              <TableRow key={day.key}>
                                <TableCell>{day.label}</TableCell>
                                <TableCell>{day.qty}</TableCell>
                              </TableRow>
                            ))}
                            <TableRow className="bg-bg-hover">
                              <TableCell className="font-semibold">Total</TableCell>
                              <TableCell className="font-semibold">
                                {Object.values(dailyQuantities).reduce((sum, qty) => sum + qty, 0)}
                              </TableCell>
                            </TableRow>
                          </TableBody>
                        </Table>
                      </TableContainer>

                      <Typography variant="body2" color="text.secondary">
                        * Prices are estimates. Final pricing will be confirmed upon admin approval.
                      </Typography>
                    </DialogContent>
                    <DialogActions>
                      <Button onClick={() => setConfirmationDialogOpen(false)} className="crm-btn crm-btn-ghost crm-btn-sharp">
                        Back
                      </Button>
                      <Button
                        variant="contained"
                        onClick={() => {
                          handleWeeklyPurchaseRequest();
                          setConfirmationDialogOpen(false);
                        }}
                        className="crm-btn crm-btn-success crm-btn-sharp"
                        startIcon={<CheckCircleIcon />}
                      >
                        Confirm Order
                      </Button>
                    </DialogActions>
                  </Dialog>

                  {/* Reorder Notification Dialog */}
                  <Dialog
                    open={reorderDialogOpen}
                    onClose={() => setReorderDialogOpen(false)}
                    maxWidth="sm"
                    fullWidth
                  >
                    <DialogTitle sx={{ fontWeight: 'bold', color: 'primary.main' }}>
                      Ready for Next Week?
                    </DialogTitle>
                    <DialogContent>
                      <Typography variant="body1" sx={{ mb: 2 }}>
                        Your weekly data deliveries have been completed! Would you like to place an order for next week?
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        You can reorder the same categories or adjust quantities as needed.
                      </Typography>
                    </DialogContent>
                    <DialogActions>
                      <Button onClick={() => setReorderDialogOpen(false)} className="crm-btn crm-btn-ghost crm-btn-sharp">
                        Maybe Later
                      </Button>
                      <Button
                        variant="contained"
                        onClick={() => {
                          setReorderDialogOpen(false);
                          setActiveTab(1); // Navigate to Request Data Purchase tab
                        }}
                        className="crm-btn crm-btn-primary crm-btn-sharp"
                        startIcon={<ShoppingCartIcon />}
                      >
                        Order Now
                      </Button>
                    </DialogActions>
                  </Dialog>
                </Box>}

                {/* Purchase Requests Tab */}
                {activeTab === 2 && <Box sx={{ p: 3 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                    <div className="flex items-start gap-2 text-text-primary">
                      <CreditCardIcon />
                      <div>
                        <p className="text-base font-semibold">Purchase Requests</p>
                        <p className="text-xs text-text-secondary">
                          Track request status and download approved days.
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="outlined"
                      onClick={() => loadRequests()}
                      startIcon={<RefreshIcon />}
                      className="crm-btn crm-btn-outline crm-btn-sharp"
                    >
                      Refresh
                    </Button>
                  </Box>
                  <div className="overflow-hidden rounded-2xl border border-[#d9dcef] bg-white">
                    <div className="grid grid-cols-[1.15fr_0.85fr_0.95fr_0.85fr_2.2fr] bg-[#f3f4f8]">
                      {["Category", "Quantity", "Status", "Date", "Actions"].map((head) => (
                        <div
                          key={head}
                          className={`px-4 py-3 text-[12px] font-semibold uppercase tracking-[0.1em] text-[#65749c] ${head === "Actions" ? "text-left" : "text-center"}`}
                        >
                          {head}
                        </div>
                      ))}
                    </div>

                    {filteredRequests.length === 0 ? (
                      <div className="px-6 py-12 text-center">
                        <AssignmentIcon sx={{ fontSize: '3rem', color: 'grey.400', marginBottom: '8px' }} />
                        <Typography variant="h6" color="text.secondary">No purchase requests found</Typography>
                        <Typography variant="body2" color="text.secondary">Try adjusting your filters or create a new request</Typography>
                      </div>
                    ) : (
                      filteredRequests.map((req) => (
                        <div key={req._id} className="grid grid-cols-[1.15fr_0.85fr_0.95fr_0.85fr_2.2fr] border-t border-[#e6e8f4]">
                          <div className="flex items-center justify-center px-4 py-4">
                            <span className="inline-flex min-w-[84px] justify-center rounded-full bg-[#f1ecff] px-3 py-1 text-xs font-semibold text-[#6c47d9]">
                              {getRequestCategoryLabel(req)}
                            </span>
                          </div>
                          <div className="flex items-center justify-center px-4 py-4">
                            <span className="inline-flex min-w-[56px] justify-center rounded-full bg-[#ffe6ec] px-3 py-1 text-xs font-semibold text-[#be123c]">
                              {getRequestQuantity(req)}
                            </span>
                          </div>
                          <div className="flex items-center justify-center px-4 py-4">
                            <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                              (req.status === "approved" || req.status === "completed")
                                ? "bg-[#dcfce7] text-[#15803d]"
                                : req.status === "rejected"
                                ? "bg-[#fee2e2] text-[#b91c1c]"
                                : "bg-[#fef3c7] text-[#a16207]"
                            }`}>
                              {req.status}
                            </span>
                          </div>
                          <div className="flex items-center justify-center px-4 py-4 text-sm text-[#1a1a2e]">
                            {new Date(req.createdAt).toLocaleDateString()}
                          </div>
                          <div className="flex items-center px-4 py-4">
                            {(req.status === 'approved' || req.status === 'completed') && (
                              <div className="flex flex-wrap items-center gap-1.5">
                                {[
                                  { day: 'monday', short: 'mon', label: 'MON' },
                                  { day: 'tuesday', short: 'tue', label: 'TUE' },
                                  { day: 'wednesday', short: 'wed', label: 'WED' },
                                  { day: 'thursday', short: 'thu', label: 'THU' },
                                  { day: 'friday', short: 'fri', label: 'FRI' },
                                ].map(({ day, short, label }, idx) => {
                                  const qty = Number(req.dailyQuantities?.[day] ?? req.dailyQuantities?.[short] ?? 0);
                                  const isActiveDay = qty > 0;
                                  const requestCategory = getRequestCategoryLabel(req);
                                  const dayData = dailyRequirementsState[requestCategory]?.[day] || { required: 0, uploaded: 0 };
                                  const availabilityKey = `${req._id}-${day}`;
                                  const available = (typeof requestDayAvailability[availabilityKey] !== 'undefined')
                                    ? requestDayAvailability[availabilityKey]
                                    : ((dayData.uploaded || 0) > 0);
                                  const isDelivered = !!req.deliveriesCompleted?.[day];
                                  const isDownloaded = downloadedButtons[`${req._id}-${day}`] || isDelivered;
                                  const isDownloading = !!downloadingDayKeys[`${req._id}-${day}`];
                                  const disabled = !isActiveDay || !req.weekRange?.startDate || isDownloaded;
                                  return (
                                    <Button
                                      key={`${req._id}-${day}`}
                                      size="small"
                                      variant={isDownloaded ? 'contained' : (available && isActiveDay ? 'contained' : 'outlined')}
                                      color={isDownloaded ? 'success' : (available && isActiveDay ? 'success' : 'inherit')}
                                      className={`min-w-[46px] px-2 py-1 text-[10px] ${(!available || !isActiveDay) ? "border-[#d6dbef] bg-[#f5f7fb] text-[#6b7280]" : ""}`}
                                      disabled={disabled || isDownloading}
                                      onClick={async (e) => {
                                        e.stopPropagation();
                                        if (!isActiveDay) return;
                                        const key = `${req._id}-${day}`;
                                        if (downloadingDayKeys[key] || isDownloaded) return;
                                        setDownloadingDayKeys((prev) => ({ ...prev, [key]: true }));
                                        try {
                                          const start = new Date(req.weekRange.startDate);
                                          const target = new Date(start);
                                          target.setDate(start.getDate() + idx);
                                          const iso = formatLocalISODate(target);
                                          const p = await dataAPI.collectDaily({
                                            date: iso,
                                            purchaseRequestId: req._id,
                                            dayOfWeek: day,
                                          });
                                          const payload = p?.data || {};
                                          if (
                                            String(payload.purchaseRequestId || "") !== String(req._id) ||
                                            payload.dayOfWeek !== day ||
                                            payload.date !== iso
                                          ) {
                                            setError('Received mismatched allocation response');
                                            return;
                                          }
                                          const allocations = Array.isArray(payload.allocations) ? payload.allocations : [];
                                          const allocForReq = allocations.find(
                                            (a) =>
                                              String(a.purchaseRequestId) === String(req._id) &&
                                              (!a.dayOfWeek || a.dayOfWeek === day) &&
                                              (!a.date || a.date === iso)
                                          );
                                          if (!allocForReq || !allocForReq.data || allocForReq.data.length === 0) {
                                            setError(payload.message || 'No allocated data available for this request/date');
                                            return;
                                          }
                                          const rows = allocForReq.data.map(it => ({ ...it.metadata, index: it.index }));
                                          const ws = XLSX.utils.json_to_sheet(rows);
                                          const wb = XLSX.utils.book_new();
                                          XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
                                          XLSX.writeFile(wb, `${requestCategory}_${label}_${iso}.xlsx`);
                                          setSuccess('Downloaded allocated data');
                                          await loadPurchased();
                                          setDownloadedButtons(prev => {
                                            const next = { ...prev, [key]: true };
                                            try { localStorage.setItem('downloadedButtons', JSON.stringify(next)); } catch (e) {}
                                            return next;
                                          });
                                          setRequests((prev) =>
                                            prev.map((r) => {
                                              if (String(r._id) !== String(req._id)) return r;
                                              const deliveriesCompleted = {
                                                ...(r.deliveriesCompleted || {}),
                                                [day]: true,
                                              };
                                              const allCompleted = ["monday", "tuesday", "wednesday", "thursday", "friday"].every(
                                                (d) =>
                                                  Number(r.dailyQuantities?.[d] || 0) <= 0 ||
                                                  deliveriesCompleted[d]
                                              );
                                              return {
                                                ...r,
                                                deliveriesCompleted,
                                                status: allCompleted ? "completed" : r.status,
                                              };
                                            })
                                          );
                                        } catch (err) {
                                          console.error('Failed to download allocated data:', err);
                                          setError(err.response?.data?.message || 'Failed to download allocated data');
                                        } finally {
                                          setDownloadingDayKeys((prev) => ({ ...prev, [key]: false }));
                                        }
                                      }}
                                    >
                                      {label}
                                    </Button>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </Box>}

                {/* Purchased Data Tab */}
                {activeTab === 3 && <Box sx={{ p: 3 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                    <div className="flex items-start gap-2 text-text-primary">
                      <DownloadIcon />
                      <div>
                        <p className="text-base font-semibold">Purchased Data</p>
                        <p className="text-xs text-text-secondary">
                          Review purchased items and export data files.
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="outlined"
                      onClick={() => loadPurchased()}
                      startIcon={<RefreshIcon />}
                      className="crm-btn crm-btn-outline crm-btn-sharp"
                    >
                      Refresh
                    </Button>
                  </Box>

                  {filteredPurchased.length === 0 ? (
                    <Card className="crm-card">
                      <CardContent sx={{ textAlign: 'center', py: 6 }}>
                        <DataUsageIcon sx={{ fontSize: '4rem', color: 'grey.400', mb: 2 }} />
                        <Typography variant="h6" color="text.secondary">
                          No purchased data found
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Your purchased data will appear here
                        </Typography>
                      </CardContent>
                    </Card>
                  ) : (
                    filteredPurchased.map((purchase) => (
                      <Card key={purchase._id} className="crm-card" sx={{ mb: 3 }}>
                        <CardContent sx={{ p: 3 }}>
                          {(() => {
                            const items = Array.isArray(purchase.dataItems) ? purchase.dataItems : [];
                            const uniqueCategories = Array.from(
                              new Set(items.map((it) => it?.category).filter(Boolean))
                            );
                            return (
                              <>
                                <div className="flex flex-wrap items-start justify-between gap-3">
                                  <div>
                                    <Typography variant="h6" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
                                      Purchase #{purchase._id.slice(-6)}
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary">
                                      Purchased on {new Date(purchase.purchasedAt).toLocaleDateString()}
                                    </Typography>
                                  </div>
                                  <Button
                                    variant="outlined"
                                    size="small"
                                    onClick={() => handleDownloadData(purchase)}
                                    className="crm-btn crm-btn-success crm-btn-sharp"
                                    startIcon={<DownloadIcon />}
                                  >
                                    Download Excel
                                  </Button>
                                </div>

                                <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
                                  <div className="rounded-xl border border-[#dbe2f6] bg-[#f7f9ff] px-3 py-2">
                                    <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[#7381aa]">Total Items</p>
                                    <p className="mt-1 text-base font-semibold text-[#1a2a47]">{items.length}</p>
                                  </div>
                                  <div className="rounded-xl border border-[#dbe2f6] bg-[#f7f9ff] px-3 py-2">
                                    <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[#7381aa]">Categories</p>
                                    <p className="mt-1 text-base font-semibold text-[#1a2a47]">{uniqueCategories.length}</p>
                                  </div>
                                  <div className="rounded-xl border border-[#dbe2f6] bg-[#f7f9ff] px-3 py-2">
                                    <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[#7381aa]">Total Amount</p>
                                    <p className="mt-1 text-base font-semibold text-[#1a2a47]">
                                      ${items.reduce((sum, it) => sum + (Number(it?.price) || 0), 0).toFixed(2)}
                                    </p>
                                  </div>
                                </div>

                                <Divider sx={{ my: 2 }} />
                                <TableContainer component={Paper} sx={{ borderRadius: 2, border: '1px solid #e2e6f6' }}>
                                  <Table size="small" sx={{ tableLayout: 'fixed' }}>
                                    <TableHead className="crm-thead">
                                      <TableRow>
                                        <TableCell className="crm-cell-head text-center" sx={{ width: 90, textAlign: 'center' }}>Item #</TableCell>
                                        <TableCell className="crm-cell-head text-center" sx={{ width: 160, textAlign: 'center' }}>Category</TableCell>
                                        <TableCell className="crm-cell-head text-center" sx={{ width: 110, textAlign: 'center' }}>Unit Price</TableCell>
                                        <TableCell className="crm-cell-head text-left" sx={{ textAlign: 'left' }}>Details</TableCell>
                                      </TableRow>
                                    </TableHead>
                                    <TableBody>
                                      {items.length === 0 ? (
                                        <TableRow>
                                          <TableCell colSpan={4} sx={{ textAlign: 'center', py: 3, color: '#7381aa' }}>
                                            No items available in this purchase.
                                          </TableCell>
                                        </TableRow>
                                      ) : (
                                        items.map((item, idx) => {
                                          const details = [];
                                          if (item?.metadata?.deliveryDate) details.push(`Date: ${item.metadata.deliveryDate}`);
                                          if (item?.metadata?.dayOfWeek) details.push(`Day: ${item.metadata.dayOfWeek}`);
                                          return (
                                            <TableRow key={`${purchase._id}-${item.index || idx}`} hover>
                                              <TableCell sx={{ textAlign: 'center' }}>
                                                <Chip
                                                  label={item.index ?? idx + 1}
                                                  size="small"
                                                  color="primary"
                                                  variant="outlined"
                                                />
                                              </TableCell>
                                              <TableCell sx={{ textAlign: 'center' }}>
                                                <Typography variant="body2" sx={{ fontWeight: 600, textAlign: 'center' }}>
                                                  {item.category || '-'}
                                                </Typography>
                                              </TableCell>
                                              <TableCell sx={{ textAlign: 'center' }}>
                                                <Typography variant="body2" color="primary" sx={{ fontWeight: 'bold', textAlign: 'center' }}>
                                                  ${(Number(item.price) || 0).toFixed(2)}
                                                </Typography>
                                              </TableCell>
                                              <TableCell sx={{ textAlign: 'left' }}>
                                                <Typography variant="body2" color="text.secondary">
                                                  {details.length ? details.join(' | ') : 'Standard purchased item'}
                                                </Typography>
                                              </TableCell>
                                            </TableRow>
                                          );
                                        })
                                      )}
                                    </TableBody>
                                  </Table>
                                </TableContainer>
                              </>
                            );
                          })()}
                        </CardContent>
                      </Card>
                    ))
                  )}
                </Box>
                }

                {/* Profile Tab */}
                {activeTab === 4 && <Box sx={{ p: 3 }}>
                  <div className="mb-4 flex items-start gap-2 text-text-primary">
                    <PersonIcon />
                    <div>
                      <p className="text-base font-semibold">Profile Settings</p>
                      <p className="text-xs text-text-secondary">
                        Update your personal and company details.
                      </p>
                    </div>
                  </div>

                  <Grid container spacing={3}>
                    <Grid item xs={12} md={8}>
                      <Card sx={{
                        borderRadius: 3,
                        boxShadow: '0 4px 20px rgba(124,58,237,0.12)',
                        background: 'linear-gradient(145deg, #ffffff 0%, #f8f9fa 100%)'
                      }}>
                        <CardContent sx={{ p: 3 }}>
                          <Typography variant="h6" sx={{ mb: 3, fontWeight: 'bold' }}>
                            {isEditing ? 'Edit Your Profile' : (profile.firstName ? 'Your Profile Information' : 'Add Your Profile Information')}
                          </Typography>

                          {isEditing || !profile.firstName ? (
                            <>
                              <TextField
                                fullWidth
                                label="Email"
                                type="email"
                                value={profile.email || user?.email || ''}
                                disabled
                                InputProps={{ readOnly: true }}
                                helperText="Email is managed by admin and cannot be changed here."
                                sx={{ mb: 3, borderRadius: 2 }}
                              />

                              <TextField
                                fullWidth
                                label="First Name"
                                value={profile.firstName || ''}
                                onChange={(e) => setProfile({ ...profile, firstName: e.target.value })}
                                sx={{ mb: 3, borderRadius: 2 }}
                              />

                              <TextField
                                fullWidth
                                label="Last Name"
                                value={profile.lastName || ''}
                                onChange={(e) => setProfile({ ...profile, lastName: e.target.value })}
                                sx={{ mb: 3, borderRadius: 2 }}
                              />

                              <TextField
                                fullWidth
                                label="Company"
                                value={profile.company || ''}
                                onChange={(e) => setProfile({ ...profile, company: e.target.value })}
                                sx={{ mb: 3, borderRadius: 2 }}
                              />

                              <TextField
                                fullWidth
                                label="Phone"
                                value={profile.phone || ''}
                                onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                                sx={{ mb: 3, borderRadius: 2 }}
                              />

                              <TextField
                                fullWidth
                                label="Street"
                                value={profile.address?.street || ''}
                                onChange={(e) => setProfile({
                                  ...profile,
                                  address: { ...profile.address, street: e.target.value }
                                })}
                                sx={{ mb: 3, borderRadius: 2 }}
                              />

                              <TextField
                                fullWidth
                                label="City"
                                value={profile.address?.city || ''}
                                onChange={(e) => setProfile({
                                  ...profile,
                                  address: { ...profile.address, city: e.target.value }
                                })}
                                sx={{ mb: 3, borderRadius: 2 }}
                              />

                              <TextField
                                fullWidth
                                label="State"
                                value={profile.address?.state || ''}
                                onChange={(e) => setProfile({
                                  ...profile,
                                  address: { ...profile.address, state: e.target.value }
                                })}
                                sx={{ mb: 3, borderRadius: 2 }}
                              />

                              <TextField
                                fullWidth
                                label="Zip Code"
                                value={profile.address?.zipCode || ''}
                                onChange={(e) => setProfile({
                                  ...profile,
                                  address: { ...profile.address, zipCode: e.target.value }
                                })}
                                sx={{ mb: 3, borderRadius: 2 }}
                              />

                              <TextField
                                fullWidth
                                label="Country"
                                value={profile.address?.country || ''}
                                onChange={(e) => setProfile({
                                  ...profile,
                                  address: { ...profile.address, country: e.target.value }
                                })}
                                sx={{ mb: 3, borderRadius: 2 }}
                              />

                              <Box sx={{ display: 'flex', gap: 2, mt: 3 }}>
                                {profile.firstName && (
                                <Button
                                  variant="outlined"
                                  size="large"
                                  onClick={() => setIsEditing(false)}
                                  className="crm-btn crm-btn-ghost crm-btn-sharp flex-1"
                                  title="Cancel editing and return to view mode"
                                >
                                  Cancel
                                </Button>
                                )}
                                <Button
                                  variant="contained"
                                  size="large"
                                  onClick={handleSaveProfile}
                                  className="crm-btn crm-btn-success crm-btn-sharp flex-1"
                                  startIcon={<PersonIcon />}
                                >
                                  Save Profile
                                </Button>
                              </Box>
                            </>
                          ) : (
                            <>
                              <div className="mx-auto w-full max-w-[350px]">
                                <div className="relative min-h-[590px] overflow-hidden rounded-[28px] border border-[#d6e2f5] bg-gradient-to-b from-[#eaf3ff] via-[#f4f8ff] to-[#ffffff] p-5 shadow-[0_12px_28px_rgba(70,100,160,0.16)] transition-all hover:-translate-y-0.5 hover:shadow-[0_16px_36px_rgba(70,100,160,0.22)]">
                                  <div className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-[#b7d6ff]/55 blur-2xl" />
                                  <div className="absolute -left-8 bottom-28 h-20 w-20 rounded-full bg-[#d8e8ff]/60 blur-2xl" />

                                  <div className="relative z-10 flex justify-center">
                                    <Avatar sx={{ width: 92, height: 92, bgcolor: '#5f7fc7', color: '#ffffff', border: '4px solid rgba(255,255,255,0.9)' }}>
                                      <PersonIcon sx={{ fontSize: '2.5rem' }} />
                                    </Avatar>
                                  </div>

                                  <div className="relative z-10 mt-4 text-center">
                                    <p className="text-2xl font-bold text-[#1d2a45]">{userDisplayName}</p>
                                    <p className="mt-1 text-sm italic text-[#5f739c]">{profile.company || "Independent Professional"}</p>
                                  </div>

                                  <div className="relative z-10 mt-6 space-y-2.5">
                                    {[
                                      {
                                        label: "Email",
                                        value: profile.email || user?.email || "Not set",
                                        icon: (
                                          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
                                            <path d="M4 7h16v10H4z" />
                                            <path d="M4 8l8 6 8-6" />
                                          </svg>
                                        ),
                                      },
                                      {
                                        label: "Phone",
                                        value: profile.phone || "Not set",
                                        icon: (
                                          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
                                            <path d="M7 4h3l1 4-2 2c1 2 3 4 5 5l2-2 4 1v3c0 1-1 2-2 2C10 19 5 14 5 8c0-1 1-2 2-2z" />
                                          </svg>
                                        ),
                                      },
                                      {
                                        label: "Location",
                                        value: profileAddressLine || "Not set",
                                        icon: (
                                          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
                                            <path d="M12 21s7-6 7-11a7 7 0 10-14 0c0 5 7 11 7 11z" />
                                            <circle cx="12" cy="10" r="2.5" />
                                          </svg>
                                        ),
                                      },
                                    ].map((item) => (
                                      <div
                                        key={item.label}
                                        className="rounded-2xl border border-[#d7e3f8] bg-white/88 px-3 py-3 transition-colors hover:border-[#b9cdf1] hover:bg-white"
                                      >
                                        <div className="flex items-center gap-2 text-[#4f6fa8]">
                                          <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-[#eef4ff]">
                                            {item.icon}
                                          </span>
                                          <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[#7a8fb6]">{item.label}</p>
                                        </div>
                                        <p className="mt-1.5 break-words pl-9 text-sm font-medium text-[#1a2a47]">{item.value}</p>
                                      </div>
                                    ))}
                                  </div>

                                  <div className="relative z-10 mt-4 rounded-2xl border border-[#d7e3f8] bg-white/90 px-3 py-3">
                                    <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[#7a8fb6]">Address Details</p>
                                    {profileAddressLines.length > 0 ? (
                                      <div className="mt-1.5 space-y-1">
                                        {profileAddressLines.map((line) => (
                                          <p key={line} className="text-sm text-[#1a2a47]">{line}</p>
                                        ))}
                                      </div>
                                    ) : (
                                      <p className="mt-1.5 text-sm text-[#1a2a47]">Not set</p>
                                    )}
                                  </div>

                                  <div className="relative z-10 mt-5">
                                    <Button
                                      variant="outlined"
                                      size="large"
                                      onClick={() => setIsEditing(true)}
                                      className="crm-btn crm-btn-outline crm-btn-sharp w-full"
                                      startIcon={<EditIcon />}
                                    >
                                      Edit Profile
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            </>
                          )}
                        </CardContent>
                      </Card>
                    </Grid>

                    {!isProfileViewCardMode && (
                    <Grid item xs={12} md={4}>
                      <Card sx={{
                        borderRadius: 3,
                        boxShadow: '0 4px 20px rgba(124,58,237,0.12)',
                        background: 'linear-gradient(145deg, #ffffff 0%, #f8f9fa 100%)'
                      }} className="transition-all hover:-translate-y-0.5 hover:shadow-md">
                        <CardContent sx={{ p: 3, textAlign: 'center' }}>
                          <Avatar sx={{ width: 80, height: 80, mx: 'auto', mb: 2, bgcolor: '#7C3AED', color: '#ffffff' }}>
                            <PersonIcon sx={{ fontSize: '2rem' }} />
                          </Avatar>
                          <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                            {userDisplayName}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {profile.email || user?.email}
                          </Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                    )}
                  </Grid>
                </Box>}

            </Card>
      </Container>
    </div>
  );
};

export default UserDashboard;

