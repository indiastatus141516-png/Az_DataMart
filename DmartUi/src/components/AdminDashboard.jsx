import React, { useState, useEffect, useContext } from 'react';
import {
  Typography,
  Grid,
  Card,
  CardContent,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Avatar,
  IconButton,
  Divider,
  Badge,
  Checkbox,
  Select,
  MenuItem,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from "../ui/primitives";
import {
  DashboardIcon,
  PeopleIcon,
  ShoppingCartIcon,
  UploadIcon,
  CategoryIcon,
  AnalyticsIcon,
  SettingsIcon,
  MenuIcon,
  CloseIcon,
  TrendingUpIcon,
  MonetizationOnIcon,
  PersonAddIcon,
  BlockIcon,
  CheckCircleIcon,
  CancelIcon,
  EditIcon,
  VisibilityIcon,
  LogoutIcon,
  DeleteIcon,
} from "../ui/icons";
import { adminAPI, userAPI } from '../services/api';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import * as XLSX from 'xlsx';
import { toast } from "react-hot-toast";

const AdminDashboard = () => {
  const { logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [requests, setRequests] = useState([]);
  const [analytics, setAnalytics] = useState({});
  const [alerts, setAlerts] = useState([]);
  const [dataItems, setDataItems] = useState([]);
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
  const [uploadFile, setUploadFile] = useState(null);

  const [categories, setCategories] = useState([]);
  const [uploadDialog, setUploadDialog] = useState({ open: false, data: [], file: null, category: '', price: '' });
  const [viewProfileDialog, setViewProfileDialog] = useState({ open: false, user: null });
  const [editProfileDialog, setEditProfileDialog] = useState({ open: false, user: null, email: '', firstName: '', lastName: '', company: '', phone: '', address: { street: '', city: '', state: '', zipCode: '', country: '' } });
  const [deleteConfirmDialog, setDeleteConfirmDialog] = useState({ open: false, onConfirm: null });
  const [dailyRequirements, setDailyRequirements] = useState({});
  const [dailyRequirementsDates, setDailyRequirementsDates] = useState({});
  const [dailyRequirementsGrandTotal, setDailyRequirementsGrandTotal] = useState({});
  const [activeTab, setActiveTab] = useState(0);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [selectAll, setSelectAll] = useState(false);
  const [selectedRequests, setSelectedRequests] = useState([]);
  const [selectAllRequests, setSelectAllRequests] = useState(false);
  const [userSearch, setUserSearch] = useState('');
  const [requestSearch, setRequestSearch] = useState('');

  // Debounce timers for dynamic search
  const [userSearchTimer, setUserSearchTimer] = useState(null);
  const [requestSearchTimer, setRequestSearchTimer] = useState(null);
  const [requestActionLoading, setRequestActionLoading] = useState({});
  const [loadingRequirements, setLoadingRequirements] = useState(false);
  const [dailyRequirementsInputs, setDailyRequirementsInputs] = useState({});
  const [uploadDailyDataDialog, setUploadDailyDataDialog] = useState({ open: false, category: '', dayOfWeek: '', date: '', file: null });
  const [uploadDailyPreview, setUploadDailyPreview] = useState({ open: false, categoryId: null, categoryName: '', file: null, rows: [], dayOfWeek: '', date: '', force: false, requirementQty: null });
  const [categoryDialog, setCategoryDialog] = useState({ open: false, category: null, newName: '', newPrice: '' });
  const [deleteCategoryDialog, setDeleteCategoryDialog] = useState({ open: false, category: null });
  const [uploadCategoryFile, setUploadCategoryFile] = useState(null);
  const [categoryList, setCategoryList] = useState([]);
  const [addCategoryDialog, setAddCategoryDialog] = useState({ open: false, name: '', price: '' });
  const [addMultipleCategoriesDialog, setAddMultipleCategoriesDialog] = useState({ open: false, categories: [] });
  const [categoryUploadRows, setCategoryUploadRows] = useState([{ id: 1, categoryName: '', file: null, isEditing: true }]);
  const [uploadMultipleCategoriesDialog, setUploadMultipleCategoriesDialog] = useState({ open: false });
  const [uploadCategoryDataDialog, setUploadCategoryDataDialog] = useState({ open: false, category: '', file: null });
  const [uploadCategoryDialog, setUploadCategoryDialog] = useState({ categoryId: null, file: null });
  const [priceDialog, setPriceDialog] = useState({ open: false, item: null, newPrice: '' });

  // Fixed categories state loaded from API
  const [fixedCategories, setFixedCategories] = useState([]);
  const [editingCategory, setEditingCategory] = useState(null);
  const [editCategoryName, setEditCategoryName] = useState('');
  const [addFixedCategoryDialog, setAddFixedCategoryDialog] = useState({ open: false, name: '' });
  const [deleteFixedCategoryDialog, setDeleteFixedCategoryDialog] = useState({ open: false, category: null });

  const openUploadTab = () => {
    setActiveTab(3);
    toast.success("Upload tab ready.");
  };

  const formatDate = (d) => {
    if (!d) return '';
    const dt = new Date(d);
    return dt.toISOString().split('T')[0];
  };

  const getWeekRange = (ref = new Date()) => {
    const d = new Date(ref);
    const day = d.getDay(); // 0 (Sun) - 6 (Sat)
    // Compute Monday as start; if Sunday (0) move back 6 days
    const diffToMonday = day === 0 ? -6 : 1 - day;
    const monday = new Date(d);
    monday.setDate(d.getDate() + diffToMonday);
    const friday = new Date(monday);
    friday.setDate(monday.getDate() + 4);
    return { start: formatDate(monday), end: formatDate(friday) };
  };

  const initialWeek = getWeekRange(new Date());

  // Week picker for Daily Requirements (admin)
  const [weekStart, setWeekStart] = useState(initialWeek.start); // yyyy-mm-dd
  const [weekEnd, setWeekEnd] = useState(initialWeek.end); // yyyy-mm-dd

  const shiftWeek = (days) => {
    if (!weekStart || !weekEnd) return;
    const start = new Date(weekStart);
    start.setDate(start.getDate() + days);
    const { start: s, end: e } = getWeekRange(start);
    setWeekStart(s);
    setWeekEnd(e);
  };

  const setThisWeek = () => {
    const { start, end } = getWeekRange(new Date());
    setWeekStart(start);
    setWeekEnd(end);
  };

  const loadDailyRequirements = async (startDate, endDate) => {
    try {
      setLoadingRequirements(true);
      const params = {};
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;
      const response = await adminAPI.getDailyRequirements(params);
      setDailyRequirements(response.data.requirements || {});
      setDailyRequirementsDates(response.data.dates || {});
      setDailyRequirementsGrandTotal(response.data.grandTotal || {});
    } catch (err) {
      setError('Failed to load daily requirements');
    } finally {
      setLoadingRequirements(false);
    }
  };

  useEffect(() => {
    // Initialize week range to current Monday-Friday and load main data
    loadData();
  }, []);

  useEffect(() => {
    if (!error) return;
    toast.error(error);
  }, [error, errorToastTick]);

  useEffect(() => {
    if (!success) return;
    toast.success(success);
  }, [success, successToastTick]);

  useEffect(() => {
    if (!alerts?.length) return;
    alerts.forEach((a) => {
      if (a?.level === "critical") toast.error(a.message || "Alert");
      else toast(a?.message || "Alert");
    });
  }, [alerts]);

  // When week selection changes, refresh daily requirements
  useEffect(() => {
    if (weekStart && weekEnd) {
      loadDailyRequirements(weekStart, weekEnd);
    }
  }, [weekStart, weekEnd]);

  // When week selection changes, also refresh purchase requests for that week
  useEffect(() => {
    if (weekStart && weekEnd) {
      loadRequestsForWeek(weekStart, weekEnd);
    }
  }, [weekStart, weekEnd]);

  const loadRequestsForWeek = async (startDate, endDate) => {
    try {
      const params = {};
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;
      if (requestSearch && requestSearch.trim()) params.search = requestSearch.trim();
      const resp = await adminAPI.getPurchaseRequests(params);
      setRequests(resp.data || []);
    } catch (err) {
      // fallback: load all requests
      try {
        const resp = await adminAPI.getPurchaseRequests({ search: requestSearch && requestSearch.trim() ? requestSearch.trim() : undefined });
        setRequests(resp.data || []);
      } catch (e) {
        setError('Failed to load purchase requests');
      }
    }
  };

  const loadData = async () => {
    try {
      const [usersRes, requestsRes, analyticsRes, dataItemsRes, categoriesRes, fixedCategoriesRes] = await Promise.all([
        adminAPI.getUsers({ search: userSearch && userSearch.trim() ? userSearch.trim() : undefined }),
        adminAPI.getPurchaseRequests({ search: requestSearch && requestSearch.trim() ? requestSearch.trim() : undefined, startDate: weekStart, endDate: weekEnd }),
        adminAPI.getAnalytics(),
        adminAPI.getDataItems(),
        adminAPI.getCategories(),
        adminAPI.getFixedCategories()
      ]);
      setUsers(usersRes.data);
      setRequests(requestsRes.data);
      setAnalytics(analyticsRes.data);
      setAlerts(analyticsRes.data.alerts || []);
      setDataItems(dataItemsRes.data);
      setCategories(categoriesRes.data);
      setFixedCategories(fixedCategoriesRes.data);
    } catch (err) {
      setError('Failed to load data');
    }
  };

  // Dynamic debounced user search
  useEffect(() => {
    if (userSearchTimer) clearTimeout(userSearchTimer);
    const t = setTimeout(async () => {
      try {
        const resp = await adminAPI.getUsers({ search: userSearch && userSearch.trim() ? userSearch.trim() : undefined });
        setUsers(resp.data || []);
      } catch (err) {
        // ignore transient errors
      }
    }, 350);
    setUserSearchTimer(t);
    return () => clearTimeout(t);
  }, [userSearch]);

  // Dynamic debounced request search
  useEffect(() => {
    if (requestSearchTimer) clearTimeout(requestSearchTimer);
    const t = setTimeout(async () => {
      try {
        await loadRequestsForWeek(weekStart, weekEnd);
      } catch (err) {
        // ignore
      }
    }, 350);
    setRequestSearchTimer(t);
    return () => clearTimeout(t);
  }, [requestSearch, weekStart, weekEnd]);

  const handleUserStatusUpdate = async (userId, status) => {
    try {
      await adminAPI.updateUserStatus(userId, status);
      setSuccess('User status updated successfully');
      loadData();
    } catch (err) {
      setError('Failed to update user status');
    }
  };

  const handleRequestUpdate = async (id, status) => {
    if (requestActionLoading[id]) return;
    setRequestActionLoading((prev) => ({ ...prev, [id]: true }));
    try {
      await adminAPI.updatePurchaseRequest(id, status);
      setSuccess('Request updated successfully');
      // Refresh main data and daily requirements so admin sees populated requirements immediately
      await loadData();
      // Reload requests for current week if set
      if (weekStart && weekEnd) await loadRequestsForWeek(weekStart, weekEnd);
      if (status === 'approved') {
        // reload daily requirements created during approval
        await loadDailyRequirements(weekStart, weekEnd);
      }
    } catch (err) {
      setError('Failed to update request');
    } finally {
      setRequestActionLoading((prev) => ({ ...prev, [id]: false }));
    }
  };

  const handleFileUpload = async () => {
    if (!uploadFile) {
      setError('Please select a file');
      return;
    }

    const formData = new FormData();
    formData.append('file', uploadFile);
    adminAPI.uploadData(formData)
      .then(() => {
        setSuccess('Data uploaded successfully');
        setUploadFile(null);
        loadData();
      })
      .catch((err) => {
        setError('Failed to upload data');
      });
  };

  const handleUploadDialogSubmit = async () => {
    const { data, file } = uploadDialog;
    const updatedData = data.map((row, index) => ({
      ...row,
      category: uploadDialog.category || `Category ${index + 1}`,
      price: uploadDialog.price || 10
    }));

    // Create new Excel file with added columns
    const worksheet = XLSX.utils.json_to_sheet(updatedData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1');
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const newFile = new File([blob], file.name, { type: file.type });

    const formData = new FormData();
    formData.append('file', newFile);

    try {
      await adminAPI.uploadData(formData);
      setSuccess('Data uploaded successfully with added category and price');
      setUploadFile(null);
      setUploadDialog({ open: false, data: [], file: null });
      loadData();
    } catch (err) {
      setError('Failed to upload data');
    }
  };



  const handleCategoryUpdate = async () => {
    if (!categoryDialog.newName || !categoryDialog.newPrice || isNaN(categoryDialog.newPrice)) {
      setError('Please enter a valid category name and price');
      return;
    }

    try {
      await adminAPI.updateCategory(categoryDialog.category, {
        newCategoryName: categoryDialog.newName,
        pricePerItem: parseFloat(categoryDialog.newPrice)
      });
      setSuccess('Category updated successfully');
      setCategoryDialog({ open: false, category: null, newName: '', newPrice: '' });
      loadData();
    } catch (err) {
      setError('Failed to update category');
    }
  };

  const handlePriceUpdate = async () => {
    if (!priceDialog.newPrice || isNaN(priceDialog.newPrice)) {
      setError('Please enter a valid price');
      return;
    }

    try {
      // Assuming update for data item price; adjust API call as needed
      await adminAPI.updateDataItem(priceDialog.item._id, { price: parseFloat(priceDialog.newPrice) });
      setSuccess('Price updated successfully');
      setPriceDialog({ open: false, item: null, newPrice: '' });
      loadData();
    } catch (err) {
      setError('Failed to update price');
    }
  };

  const handleViewProfile = async (userId) => {
    try {
      const response = await adminAPI.getUserProfile(userId);
      setViewProfileDialog({ open: true, user: response.data });
    } catch (err) {
      setError('Failed to load user profile');
    }
  };

  const handleEditProfile = (user) => {
    setEditProfileDialog({
      open: true,
      user: user,
      email: user.email || '',
      firstName: user.profile?.firstName || '',
      lastName: user.profile?.lastName || '',
      company: user.profile?.company || '',
      phone: user.profile?.phone || '',
      address: {
        street: user.profile?.address?.street || '',
        city: user.profile?.address?.city || '',
        state: user.profile?.address?.state || '',
        zipCode: user.profile?.address?.zipCode || '',
        country: user.profile?.address?.country || ''
      }
    });
  };

  const handleEditProfileSubmit = async () => {
    try {
      const profileData = {
        firstName: editProfileDialog.firstName,
        lastName: editProfileDialog.lastName,
        company: editProfileDialog.company,
        phone: editProfileDialog.phone,
        address: {
          street: editProfileDialog.address.street,
          city: editProfileDialog.address.city,
          state: editProfileDialog.address.state,
          zipCode: editProfileDialog.address.zipCode,
          country: editProfileDialog.address.country
        }
      };

      const updateData = {
        profile: profileData,
        email: editProfileDialog.email
      };

      console.log('Sending update data:', updateData); // Debug log
      await adminAPI.updateUserProfile(editProfileDialog.user.userId, updateData);
      
      setSuccess('User profile updated successfully');
      setEditProfileDialog({ open: false, user: null, email: '', firstName: '', lastName: '', company: '', phone: '', address: { street: '', city: '', state: '', zipCode: '', country: '' } });
      
      // Add a small delay before reloading data to ensure the update is complete
      setTimeout(() => {
        loadData();
      }, 500);
    } catch (err) {
      console.error('Profile update error:', err); // Debug log
      setError('Failed to update user profile: ' + (err.response?.data?.message || err.message));
    }
  };

  useEffect(() => {
    setSelectAll(selectedUsers.length === users.length && users.length > 0);
  }, [selectedUsers, users]);

  useEffect(() => {
    setSelectAllRequests(selectedRequests.length === requests.length && requests.length > 0);
  }, [selectedRequests, requests]);

  const handleUserSelect = (userId) => {
    setSelectedUsers(prev => prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]);
  };

  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedUsers([]);
      setSelectAll(false);
    } else {
      setSelectedUsers(users.map(user => user.userId));
      setSelectAll(true);
    }
  };

  const handleBulkApprove = async () => {
    try {
      await Promise.all(selectedUsers.map(userId => adminAPI.updateUserStatus(userId, 'approved')));
      setSuccess('Selected users approved successfully');
      setSelectedUsers([]);
      setSelectAll(false);
      loadData();
    } catch (err) {
      setError('Failed to approve selected users');
    }
  };

  const handleBulkBlock = async () => {
    try {
      await adminAPI.bulkBlock(selectedUsers);
      setSuccess('Selected users blocked successfully');
      setSelectedUsers([]);
      setSelectAll(false);
      loadData();
    } catch (err) {
      setError('Failed to block selected users');
    }
  };

  const handleBulkUnblock = async () => {
    try {
      await adminAPI.bulkUnblock(selectedUsers);
      setSuccess('Selected users unblocked successfully');
      setSelectedUsers([]);
      setSelectAll(false);
      loadData();
    } catch (err) {
      setError('Failed to unblock selected users');
    }
  };

  const handleBulkDelete = () => {
    setDeleteConfirmDialog({
      open: true,
      onConfirm: async () => {
        try {
          await adminAPI.bulkDelete(selectedUsers);
          setSuccess('Selected users deleted successfully');
          setSelectedUsers([]);
          setSelectAll(false);
          loadData();
        } catch (err) {
          setError('Failed to delete selected users');
        } finally {
          setDeleteConfirmDialog({ open: false, onConfirm: null });
        }
      }
    });
  };

  const handleClearSelection = () => {
    setSelectedUsers([]);
    setSelectAll(false);
  };

  const handleRequestSelect = (requestId) => {
    setSelectedRequests(prev => prev.includes(requestId) ? prev.filter(id => id !== requestId) : [...prev, requestId]);
  };

  const handleSelectAllRequests = () => {
    if (selectAllRequests) {
      setSelectedRequests([]);
      setSelectAllRequests(false);
    } else {
      setSelectedRequests(requests.map(req => req._id));
      setSelectAllRequests(true);
    }
  };

  const handleClearRequestSelection = () => {
    setSelectedRequests([]);
    setSelectAllRequests(false);
  };

  const handleBulkDeleteRequests = () => {
    setDeleteConfirmDialog({
      open: true,
      onConfirm: async () => {
        try {
          await adminAPI.bulkDeletePurchaseRequests(selectedRequests);
          setSuccess('Selected requests deleted successfully');
          setSelectedRequests([]);
          setSelectAllRequests(false);
          loadData();
        } catch (err) {
          setError('Failed to delete selected requests');
        } finally {
          setDeleteConfirmDialog({ open: false, onConfirm: null });
        }
      }
    });
  };

  const handleAddCategory = async () => {
    if (!addCategoryDialog.name || !addCategoryDialog.price || isNaN(addCategoryDialog.price)) {
      setError('Please enter a valid category name and price');
      return;
    }

    try {
      await adminAPI.addCategory({
        name: addCategoryDialog.name,
        price: parseFloat(addCategoryDialog.price)
      });
      setSuccess('Category added successfully');
      setAddCategoryDialog({ open: false, name: '', price: '' });
      loadData();
    } catch (err) {
      setError('Failed to add category');
    }
  };

  const handleDeleteCategory = async () => {
    try {
      await adminAPI.deleteCategory(deleteCategoryDialog.category);
      setSuccess('Category deleted successfully');
      setDeleteCategoryDialog({ open: false, category: null });
      loadData();
    } catch (err) {
      setError('Failed to delete category');
    }
  };

  const handleAddMultipleCategories = async () => {
    try {
      // Filter out empty categories
      const validCategories = addMultipleCategoriesDialog.categories.filter(cat => cat.name && cat.price && !isNaN(cat.price));
      if (validCategories.length === 0) {
        setError('Please add at least one valid category');
        return;
      }
      // Add each category
      for (const cat of validCategories) {
        await adminAPI.addCategory({
          name: cat.name,
          price: parseFloat(cat.price)
        });
      }
      setSuccess(`${validCategories.length} categories added successfully`);
      setAddMultipleCategoriesDialog({ open: false, categories: [] });
      loadData();
    } catch (err) {
      setError('Failed to add categories');
    }
  };

  const handleUploadSingleCategoryData = async (row) => {
    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);
        const updatedData = jsonData.map(item => ({ ...item, category: row.categoryName }));
        const newWorksheet = XLSX.utils.json_to_sheet(updatedData);
        const newWorkbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(newWorkbook, newWorksheet, 'Sheet1');
        const excelBuffer = XLSX.write(newWorkbook, { bookType: 'xlsx', type: 'array' });
        const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        const newFile = new File([blob], row.file.name, { type: row.file.type });
        const formData = new FormData();
        formData.append('file', newFile);
        await adminAPI.uploadData(formData);
        setSuccess(`Data uploaded successfully for category "${row.categoryName}"`);
        // Optionally remove the row after successful upload
        setCategoryUploadRows(categoryUploadRows.filter(r => r.id !== row.id));
        loadData();
      };
      reader.onerror = () => setError('Failed to read file');
      reader.readAsArrayBuffer(row.file);
    } catch (err) {
      setError(`Failed to upload data for category "${row.categoryName}"`);
    }
  };

  const handleUploadMultipleCategoriesData = async () => {
    try {
      const uploadPromises = categoryUploadRows.filter(row => row.categoryName && row.file).map(row => {
        return new Promise(async (resolve, reject) => {
          try {
            const reader = new FileReader();
            reader.onload = async (e) => {
              const data = new Uint8Array(e.target.result);
              const workbook = XLSX.read(data, { type: 'array' });
              const sheetName = workbook.SheetNames[0];
              const worksheet = workbook.Sheets[sheetName];
              const jsonData = XLSX.utils.sheet_to_json(worksheet);
              const updatedData = jsonData.map(item => ({ ...item, category: row.categoryName }));
              const newWorksheet = XLSX.utils.json_to_sheet(updatedData);
              const newWorkbook = XLSX.utils.book_new();
              XLSX.utils.book_append_sheet(newWorkbook, newWorksheet, 'Sheet1');
              const excelBuffer = XLSX.write(newWorkbook, { bookType: 'xlsx', type: 'array' });
              const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
              const newFile = new File([blob], row.file.name, { type: row.file.type });
              const formData = new FormData();
              formData.append('file', newFile);
              await adminAPI.uploadData(formData);
              resolve();
            };
            reader.onerror = reject;
            reader.readAsArrayBuffer(row.file);
          } catch (err) {
            reject(err);
          }
        });
      });
      const results = await Promise.allSettled(uploadPromises);
      const successful = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.filter(r => r.status === 'rejected').length;
      if (successful > 0) {
        setSuccess(`${successful} categories uploaded successfully${failed > 0 ? `, ${failed} failed` : ''}`);
        setUploadMultipleCategoriesDialog({ open: false });
        setCategoryUploadRows([{ id: 1, categoryName: '', file: null, isEditing: false }]);
        loadData();
      } else {
        setError('Failed to upload any data');
      }
    } catch (err) {
      setError('Failed to upload data');
    }
  };

  const handleRequirementsInputChange = (category, day, value) => {
    setDailyRequirementsInputs(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        [day]: value
      }
    }));
  };

  const handleSetDailyRequirements = async (category) => {
    try {
      const requirements = dailyRequirementsInputs[category] || {};
      const today = new Date();
      const monday = new Date(today);
      monday.setDate(today.getDate() - today.getDay() + 1);

      const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
      const promises = days.map((day, index) => {
        const quantity = parseInt(requirements[day] || 0);
        if (quantity > 0) {
          const date = new Date(monday);
          date.setDate(monday.getDate() + index);
          return adminAPI.setDailyRequirements({
            category,
            dayOfWeek: day,
            quantity,
            date: date.toISOString().split('T')[0]
          });
        }
        return null;
      }).filter(p => p);

      await Promise.all(promises);
      setSuccess('Daily requirements set successfully');
      loadDailyRequirements();
    } catch (err) {
      setError('Failed to set daily requirements');
    }
  };

  const handleUploadDailyData = async () => {
    if (!uploadDailyDataDialog.file || !uploadDailyDataDialog.category || !uploadDailyDataDialog.dayOfWeek || !uploadDailyDataDialog.date) {
      setError('Please fill in all fields and select a file');
      return;
    }

    const formData = new FormData();
    formData.append('file', uploadDailyDataDialog.file);
    formData.append('category', uploadDailyDataDialog.category);
    formData.append('dayOfWeek', uploadDailyDataDialog.dayOfWeek);
    formData.append('date', uploadDailyDataDialog.date);

    try {
      await adminAPI.uploadDailyData(formData);
      setSuccess('Daily data uploaded successfully');
      setUploadDailyDataDialog({ open: false, category: '', dayOfWeek: '', date: '', file: null });
      loadDailyRequirements();
    } catch (err) {
      setError('Failed to upload daily data');
    }
  };

  const handleCategoryUpload = async () => {
    if (!uploadCategoryFile) {
      setError('Please select a file');
      return;
    }

    // Parse Excel file
    const reader = new FileReader();
    reader.onload = (e) => {
      const data = new Uint8Array(e.target.result);
      const workbook = XLSX.read(data, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);

      // Check if category and price columns exist
      const headers = Object.keys(jsonData[0] || {});
      const hasCategory = headers.includes('category') || headers.includes('Category');
      const hasPrice = headers.includes('price') || headers.includes('Price');

      if (hasCategory && hasPrice) {
        // Proceed with upload
        const categoriesToUpload = jsonData.map(row => ({
          name: row.category || row.Category,
          price: parseFloat(row.price || row.Price)
        })).filter(cat => cat.name && !isNaN(cat.price));

        if (categoriesToUpload.length === 0) {
          setError('No valid categories found in the file');
          return;
        }

        // Upload each category
        Promise.all(categoriesToUpload.map(cat => adminAPI.addCategory(cat)))
          .then(() => {
            setSuccess(`${categoriesToUpload.length} categories uploaded successfully`);
            setUploadCategoryFile(null);
            loadData();
          })
          .catch((err) => {
            setError('Failed to upload categories');
          });
      } else {
        setError('The Excel file must contain "category" and "price" columns');
      }
    };
    reader.readAsArrayBuffer(uploadCategoryFile);
  };

  const handleSaveCategoryName = async (categoryId) => {
    const category = fixedCategories.find(cat => cat.id === categoryId);
    if (!category || !editCategoryName.trim()) {
      setError('Please enter a valid category name');
      return;
    }

    try {
      await adminAPI.updateFixedCategory(categoryId, { name: editCategoryName.trim() });
      setSuccess('Category name updated successfully');
      setEditingCategory(null);
      setEditCategoryName('');
      loadData();
    } catch (err) {
      setError('Failed to update category name');
    }
  };

  const handleFileSelect = (categoryId, file) => {
    // Parse file and open preview dialog for optional day/date upload
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);
        const category = fixedCategories.find(c => c.id === categoryId)?.name || '';
        // Mark uploads started from Category Manager as requiring a day and date
        setUploadDailyPreview({ open: true, categoryId, categoryName: category, file, rows: jsonData, dayOfWeek: '', date: '', force: false, requirementQty: null, requireDay: true });
      } catch (err) {
        setError('Failed to parse Excel file');
      }
    };
    reader.onerror = () => setError('Failed to read file');
    reader.readAsArrayBuffer(file);
  };

  const startEditingCategory = (categoryId) => {
    const category = fixedCategories.find(cat => cat.id === categoryId);
    setEditingCategory(categoryId);
    setEditCategoryName(category ? category.name : '');
  };

  const handleUploadCategory = async (categoryId) => {
    setError('Please use the preview dialog to upload files (open automatically after file selection)');
  };

  const handlePreviewUpload = async () => {
    try {
      const { categoryName, rows, dayOfWeek, date, force } = uploadDailyPreview;
      if (!rows || rows.length === 0) {
        setError('No rows found in the file');
        return;
      }

      // If this upload originated from Category Manager require day & date
      if (uploadDailyPreview.requireDay && (!dayOfWeek || !date)) {
        setError('Please select both Day and Date before uploading from Category Manager');
        return;
      }

      // If day/date specified, use admin API to append uploaded rows to DailyRequirement
      if (dayOfWeek && date) {
        // Fetch current admin weekly requirements to get expected quantity (best-effort)
        let requirementQty = null;
        try {
          const resp = await adminAPI.getDailyRequirements();
          const reqs = resp.data.requirements || {};
          if (reqs[categoryName] && typeof reqs[categoryName][dayOfWeek] !== 'undefined') {
            requirementQty = parseInt(reqs[categoryName][dayOfWeek]) || null;
          }
        } catch (err) {
          // ignore
        }

        // If there is a requirementQty and it doesn't match, warn unless forced
        if (requirementQty !== null && requirementQty !== rows.length && !force) {
          setUploadDailyPreview(prev => ({ ...prev, requirementQty }));
          setError(`Uploaded rows (${rows.length}) do not match required quantity (${requirementQty}) for ${dayOfWeek}`);
          return;
        }

        await adminAPI.uploadDailyData({ category: categoryName, dayOfWeek, date, data: rows });
        setSuccess(`Uploaded ${rows.length} rows for ${categoryName} on ${dayOfWeek} ${date}`);
        setUploadDailyPreview({ open: false, categoryId: null, categoryName: '', file: null, rows: [], dayOfWeek: '', date: '', force: false, requirementQty: null });
        loadDailyRequirements();
        loadData();
        return;
      }

      // Otherwise send the file as legacy DataItem upload
      const formData = new FormData();
      formData.append('file', uploadDailyPreview.file);
      formData.append('category', uploadDailyPreview.categoryName);
      await adminAPI.uploadData(formData);
      setSuccess('Category data uploaded successfully');
      setUploadDailyPreview({ open: false, categoryId: null, categoryName: '', file: null, rows: [], dayOfWeek: '', date: '', force: false, requirementQty: null });
      loadData();
    } catch (err) {
      console.error(err);
      setError('Failed to upload data');
    }
  };

  const handleDeleteCategoryData = async (categoryId) => {
    const category = fixedCategories.find(cat => cat.id === categoryId);
    if (!category) return;

    try {
      await adminAPI.deleteCategoryData(categoryId);
      setSuccess('Category data deleted successfully');
      loadData();
    } catch (err) {
      setError('Failed to delete category data');
    }
  };

  const handleAddFixedCategory = async () => {
    if (!addFixedCategoryDialog.name) {
      setError('Please enter a valid name');
      return;
    }

    try {
      await adminAPI.createFixedCategory({
        name: addFixedCategoryDialog.name
      });
      setSuccess('Fixed category added successfully');
      setAddFixedCategoryDialog({ open: false, name: '' });
      loadData();
    } catch (err) {
      setError('Failed to add fixed category');
    }
  };

  const handleDeleteFixedCategory = async () => {
    try {
      await adminAPI.deleteFixedCategory(deleteFixedCategoryDialog.category.id);
      setSuccess('Fixed category deleted successfully');
      setDeleteFixedCategoryDialog({ open: false, category: null });
      loadData();
    } catch (err) {
      setError('Failed to delete fixed category');
    }
  };



  const menuItems = [
    { text: 'Dashboard Overview', icon: <DashboardIcon />, tab: 0 },
    { text: 'User Management', icon: <PeopleIcon />, tab: 1 },
    { text: 'Purchase Requests', icon: <ShoppingCartIcon />, tab: 2 },
    { text: 'Category Manager', icon: <CategoryIcon />, tab: 3 },
    { text: 'Completed Purchases', icon: <MonetizationOnIcon />, tab: 4 },
    { text: 'Daily Requirements', icon: <AnalyticsIcon />, tab: 5 },
  ];

  const renderTabContent = () => {
    const getPerDayFallbackFromTotal = (source) => {
      if (!source) return 0;
      const totalValue = Number(source?.total ?? source?.Total ?? 0);
      if (!Number.isFinite(totalValue) || totalValue <= 0) return 0;
      return Number((totalValue / 5).toFixed(2));
    };

    const getDayValue = (source, day) => {
      if (!source) return 0;
      const short = day.slice(0, 3);
      const title = day.charAt(0).toUpperCase() + day.slice(1);
      return Number(source?.[day] ?? source?.[short] ?? source?.[title] ?? 0);
    };

    const getRequirementDayValue = (source, day) => {
      const dayValue = getDayValue(source, day);
      if (Number.isFinite(dayValue) && dayValue > 0) return dayValue;
      const hasAnyExplicitDayValue = ["monday", "tuesday", "wednesday", "thursday", "friday"].some(
        (d) => {
          const value = getDayValue(source, d);
          return Number.isFinite(value) && value > 0;
        },
      );
      if (hasAnyExplicitDayValue) return Number.isFinite(dayValue) ? dayValue : 0;
      return getPerDayFallbackFromTotal(source);
    };

    switch (activeTab) {
      case 0:
        return (
          <Box className="space-y-6">
            <div className="flex items-center gap-2 text-text-primary">
              <DashboardIcon />
              <div>
                <p className="text-base font-semibold">Dashboard Overview</p>
                <p className="text-xs text-text-secondary">
                  Snapshot of revenue, activity, and recent sales.
                </p>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <Card className="rounded-xl border border-[#d9d5ff] bg-[#f0eeff] shadow-sm">
                <CardContent className="px-5 py-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-3xl font-bold text-[#1a1a2e]">${analytics.totalRevenue || 0}</p>
                      <p className="mt-1 text-sm text-[#6b7280]">Total Revenue</p>
                    </div>
                    <span className="rounded-lg bg-white/80 p-2 text-[#6c47d9]"><MonetizationOnIcon /></span>
                  </div>
                </CardContent>
              </Card>
              <Card className="rounded-xl border border-[#d9d5ff] bg-[#f0eeff] shadow-sm">
                <CardContent className="px-5 py-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-3xl font-bold text-[#1a1a2e]">{analytics.activeUsers || 0}</p>
                      <p className="mt-1 text-sm text-[#6b7280]">Active Users</p>
                    </div>
                    <span className="rounded-lg bg-white/80 p-2 text-[#6c47d9]"><PeopleIcon /></span>
                  </div>
                </CardContent>
              </Card>
              <Card className="rounded-xl border border-[#d9d5ff] bg-[#f0eeff] shadow-sm">
                <CardContent className="px-5 py-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-3xl font-bold text-[#1a1a2e]">{analytics.totalSales || 0}</p>
                      <p className="mt-1 text-sm text-[#6b7280]">Total Sales</p>
                    </div>
                    <span className="rounded-lg bg-white/80 p-2 text-[#6c47d9]"><ShoppingCartIcon /></span>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Quick Stats */}
            <Grid container spacing={3} sx={{ mb: 4 }}>
              <Grid size={{xs:12, md:3}}>
                <Card className="crm-mini-stat border-t-2 border-accent-success">
                  <CardContent className="space-y-2">
                    <p className="font-display text-2xl text-accent-success">{analytics.soldItems || 0}</p>
                    <p className="crm-label">Sold Items</p>
                  </CardContent>
                </Card>
              </Grid>
              <Grid size={{xs:12, md:3}}>
                <Card className="crm-mini-stat border-t-2 border-accent-danger">
                  <CardContent className="space-y-2">
                    <p className="font-display text-2xl text-accent-danger">{analytics.blockedUsers || 0}</p>
                    <p className="crm-label">Blocked Users</p>
                  </CardContent>
                </Card>
              </Grid>
              <Grid size={{xs:12, md:3}}>
                <Card className="crm-mini-stat border-t-2 border-accent-warning">
                  <CardContent className="space-y-2">
                    <p className="font-display text-2xl text-accent-warning">{analytics.pendingRequests || 0}</p>
                    <p className="crm-label">Pending Requests</p>
                  </CardContent>
                </Card>
              </Grid>
              <Grid size={{xs:12, md:3}}>
                <Card className="crm-mini-stat border-t-2 border-accent-primary">
                  <CardContent className="space-y-2">
                    <p className="font-display text-2xl text-accent-primary">{categories.length}</p>
                    <p className="crm-label">Categories</p>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>

            {/* Recent Sales Report */}
            <Card className="crm-card">
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2 text-text-primary">
                  <AnalyticsIcon />
                  <div>
                    <p className="text-base font-semibold">Recent Sales Report</p>
                    <p className="text-xs text-text-secondary">Latest completed purchases</p>
                  </div>
                </div>
                <div className="overflow-hidden rounded-2xl border border-[#d9dcef] bg-white" style={{ marginTop: '16px' }}>
                  <div className="grid grid-cols-[2fr_1fr_1fr_1fr] bg-[#f3f4f8]">
                    {['Customer', 'Amount', 'Date', 'Status'].map((h) => (
                      <div key={h} className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.1em] text-[#65749c]">{h}</div>
                    ))}
                  </div>
                  {(analytics.recentPurchases || []).map((purchase) => (
                    <div key={purchase._id} className="grid grid-cols-[2fr_1fr_1fr_1fr] border-t border-[#e6e8f4]">
                      <div className="flex items-center gap-2 px-4 py-3">
                        <Avatar sx={{ bgcolor: 'primary.main' }}>
                          {purchase.userId?.email?.charAt(0).toUpperCase() || 'U'}
                        </Avatar>
                        <span className="text-sm text-text-primary">{purchase.userId?.email || 'N/A'}</span>
                      </div>
                      <div className="px-4 py-3 text-sm font-semibold text-text-primary">${purchase.totalPrice}</div>
                      <div className="px-4 py-3 text-sm text-text-primary">{new Date(purchase.createdAt).toLocaleDateString()}</div>
                      <div className="px-4 py-3"><Chip label="Completed" color="success" size="small" /></div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </Box>
        );
      case 1:
        return (
          <Card>
            <CardContent>
              <div className="flex items-center gap-2 text-text-primary">
                <PeopleIcon />
                <div>
                  <p className="text-base font-semibold">User Management</p>
                  <p className="text-xs text-text-secondary">Review requests, set roles, and manage user status.</p>
                </div>
              </div>
              <Box className="crm-filter" sx={{ mb: 2 }}>
                <TextField
                  size="small"
                  label="Search users"
                  placeholder="Search by email, userId, name, company"
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') loadData(); }}
                  className="min-w-[240px] sm:min-w-[320px]"
                />
                <Button size="small" variant="outlined" className="crm-btn crm-btn-outline crm-btn-sharp" onClick={loadData}>Search</Button>
                <Button size="small" variant="text" className="crm-btn crm-btn-ghost crm-btn-sharp" onClick={() => { setUserSearch(''); loadData(); }}>Clear</Button>
              </Box>
              <Box sx={{ mb: 2, display: 'flex', gap: 1 }}>
                <Button variant="contained" color="success" className={`crm-btn crm-btn-success crm-btn-sharp ${selectedUsers.length === 0 ? "opacity-50 cursor-not-allowed" : ""}`} onClick={handleBulkApprove} disabled={selectedUsers.length === 0}>Bulk Approve ({selectedUsers.length})</Button>
                <Button variant="contained" color="error" className={`crm-btn crm-btn-danger crm-btn-sharp ${selectedUsers.length === 0 ? "opacity-50 cursor-not-allowed" : ""}`} onClick={handleBulkBlock} disabled={selectedUsers.length === 0}>Bulk Block ({selectedUsers.length})</Button>
                <Button variant="contained" color="warning" className={`crm-btn crm-btn-warning crm-btn-sharp ${selectedUsers.length === 0 ? "opacity-50 cursor-not-allowed" : ""}`} onClick={handleBulkUnblock} disabled={selectedUsers.length === 0}>Bulk Unblock ({selectedUsers.length})</Button>
                <Button variant="contained" color="error" className={`crm-btn crm-btn-danger crm-btn-sharp ${selectedUsers.length === 0 ? "opacity-50 cursor-not-allowed" : ""}`} onClick={handleBulkDelete} disabled={selectedUsers.length === 0}>Bulk Delete ({selectedUsers.length})</Button>
                <Button variant="outlined" className={`crm-btn crm-btn-outline crm-btn-sharp ${selectedUsers.length === 0 ? "opacity-50 cursor-not-allowed" : ""}`} onClick={handleClearSelection} disabled={selectedUsers.length === 0}>Clear Selection</Button>
              </Box>
              <div className="overflow-hidden rounded-2xl border border-[#d9dcef] bg-white shadow-sm" style={{ marginTop: '16px' }}>
                <div className="grid grid-cols-[52px_2.3fr_1fr_0.9fr_1fr_1fr] bg-[#f3f4f8]">
                  <div className="flex items-center justify-center px-3 py-3">
                    <Checkbox checked={selectAll} indeterminate={selectedUsers.length > 0 && selectedUsers.length < users.length} onChange={handleSelectAll} />
                  </div>
                  <div className="px-3 py-3 text-[11px] font-semibold uppercase tracking-[0.1em] text-[#65749c]">User</div>
                  <div className="px-3 py-3 text-center text-[11px] font-semibold uppercase tracking-[0.1em] text-[#65749c]">Status</div>
                  <div className="px-3 py-3 text-center text-[11px] font-semibold uppercase tracking-[0.1em] text-[#65749c]">Role</div>
                  <div className="px-3 py-3 text-center text-[11px] font-semibold uppercase tracking-[0.1em] text-[#65749c]">Joined</div>
                  <div className="px-3 py-3 text-center text-[11px] font-semibold uppercase tracking-[0.1em] text-[#65749c]">Actions</div>
                </div>
                {users.map((user) => (
                  <div key={user.userId} className="grid grid-cols-[52px_2.3fr_1fr_0.9fr_1fr_1fr] border-t border-[#e6e8f4] transition-colors hover:bg-[#f8f9ff]">
                    <div className="flex items-center justify-center px-3 py-3">
                      <Checkbox checked={selectedUsers.includes(user.userId)} onChange={() => handleUserSelect(user.userId)} />
                    </div>
                    <div className="flex items-center gap-2 px-3 py-3">
                      <Avatar>{user.email.charAt(0).toUpperCase()}</Avatar>
                      <div>
                        <Typography variant="body1">{user.email}</Typography>
                        <Typography variant="body2" color="text.secondary">ID: {user.userId}</Typography>
                      </div>
                    </div>
                    <div className="flex items-center justify-center px-3 py-3">
                      <Chip label={user.status} color={user.status === 'approved' ? 'success' : user.status === 'rejected' || user.status === 'blocked' ? 'error' : 'warning'} size="small" />
                    </div>
                    <div className="flex items-center justify-center px-3 py-3 text-sm capitalize">{user.role}</div>
                    <div className="flex items-center justify-center px-3 py-3 text-sm whitespace-nowrap">{new Date(user.requestedAt).toLocaleDateString()}</div>
                    <div className="flex items-center justify-center gap-1 px-3 py-3">
                      {user.role !== 'admin' && user.status === 'pending' && (
                        <>
                          <IconButton size="small" color="success" onClick={() => handleUserStatusUpdate(user.userId, 'approved')}><CheckCircleIcon /></IconButton>
                          <IconButton size="small" color="error" onClick={() => handleUserStatusUpdate(user.userId, 'rejected')}><CancelIcon /></IconButton>
                        </>
                      )}
                      {user.role !== 'admin' && user.status === 'approved' && (
                        <IconButton size="small" color="error" onClick={() => handleUserStatusUpdate(user.userId, 'blocked')}><BlockIcon /></IconButton>
                      )}
                      {user.role !== 'admin' && user.status === 'blocked' && (
                        <IconButton size="small" color="warning" onClick={() => handleUserStatusUpdate(user.userId, 'approved')}><CheckCircleIcon /></IconButton>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        );
      case 2:
        return (
          <Card>
            <CardContent>
              <div className="flex items-center gap-2 text-text-primary">
                <ShoppingCartIcon />
                <div>
                  <p className="text-base font-semibold">Purchase Requests</p>
                  <p className="text-xs text-text-secondary">Approve weekly demand and monitor request status.</p>
                </div>
              </div>
              <Box className="crm-filter" sx={{ mb: 2 }}>
                <TextField size="small" label="Search requests" placeholder="Search by user email, userId, category, status" value={requestSearch} onChange={(e) => setRequestSearch(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') loadRequestsForWeek(weekStart, weekEnd); }} className="min-w-[240px] sm:min-w-[320px]" />
                <Button size="small" variant="outlined" className="crm-btn crm-btn-outline crm-btn-sharp" onClick={() => loadRequestsForWeek(weekStart, weekEnd)}>Search</Button>
                <Button size="small" variant="text" className="crm-btn crm-btn-ghost crm-btn-sharp" onClick={() => { setRequestSearch(''); loadRequestsForWeek(weekStart, weekEnd); }}>Clear</Button>
              </Box>
              <Box className="crm-filter" sx={{ mb: 2 }}>
                <Button size="small" variant="outlined" className="crm-btn crm-btn-outline crm-btn-sharp" onClick={() => shiftWeek(-7)}>Prev Week</Button>
                <Button size="small" variant="outlined" className="crm-btn crm-btn-outline crm-btn-sharp" onClick={() => shiftWeek(7)}>Next Week</Button>
                <Button size="small" variant="outlined" className="crm-btn crm-btn-outline crm-btn-sharp" onClick={setThisWeek}>This Week</Button>
                <TextField size="small" label="Week Start" type="date" value={weekStart} onChange={(e) => { const s = e.target.value; const startDate = new Date(s); const { start, end } = getWeekRange(startDate); setWeekStart(start); setWeekEnd(end); }} />
                <TextField size="small" label="Week End" type="date" value={weekEnd} onChange={(e) => { const eDate = e.target.value; const endDate = new Date(eDate); const { start, end } = getWeekRange(endDate); setWeekStart(start); setWeekEnd(end); }} />
                <Typography variant="body2" sx={{ ml: 1, color: 'text.secondary' }}>{weekStart && weekEnd ? `${weekStart} -> ${weekEnd}` : ''}</Typography>
              </Box>
              <Box sx={{ mb: 2, display: 'flex', gap: 1 }}>
                <Button variant="contained" color="error" className={`crm-btn crm-btn-danger crm-btn-sharp ${selectedRequests.length === 0 ? "opacity-50 cursor-not-allowed" : ""}`} onClick={handleBulkDeleteRequests} disabled={selectedRequests.length === 0}>Bulk Delete ({selectedRequests.length})</Button>
                <Button variant="outlined" className={`crm-btn crm-btn-outline crm-btn-sharp ${selectedRequests.length === 0 ? "opacity-50 cursor-not-allowed" : ""}`} onClick={handleClearRequestSelection} disabled={selectedRequests.length === 0}>Clear Selection</Button>
              </Box>
              <div className="overflow-hidden rounded-2xl border border-[#d9dcef] bg-white shadow-sm" style={{ marginTop: '16px' }}>
                <div className="grid grid-cols-[52px_1.9fr_1fr_2fr_0.9fr_1fr_1fr] bg-[#f3f4f8]">
                  <div className="flex items-center justify-center px-3 py-3">
                    <Checkbox checked={selectAllRequests} indeterminate={selectedRequests.length > 0 && selectedRequests.length < requests.length} onChange={handleSelectAllRequests} />
                  </div>
                  <div className="px-3 py-3 text-[11px] font-semibold uppercase tracking-[0.1em] text-[#65749c]">User</div>
                  <div className="px-3 py-3 text-center text-[11px] font-semibold uppercase tracking-[0.1em] text-[#65749c]">Category</div>
                  <div className="px-3 py-3 text-center text-[11px] font-semibold uppercase tracking-[0.1em] text-[#65749c]">Quantity (Mon-Fri)</div>
                  <div className="px-3 py-3 text-center text-[11px] font-semibold uppercase tracking-[0.1em] text-[#65749c]">Total</div>
                  <div className="px-3 py-3 text-center text-[11px] font-semibold uppercase tracking-[0.1em] text-[#65749c]">Status</div>
                  <div className="px-3 py-3 text-center text-[11px] font-semibold uppercase tracking-[0.1em] text-[#65749c]">Actions</div>
                </div>
                {requests.map((req) => (
                  <div key={req._id} className="grid grid-cols-[52px_1.9fr_1fr_2fr_0.9fr_1fr_1fr] border-t border-[#e6e8f4] transition-colors hover:bg-[#f8f9ff]">
                    <div className="flex items-center justify-center px-3 py-3">
                      <Checkbox checked={selectedRequests.includes(req._id)} onChange={() => handleRequestSelect(req._id)} />
                    </div>
                    <div className="flex items-center px-3 py-3">
                      <div className="mr-2"><Avatar>{req.userEmail?.charAt(0)?.toUpperCase() || req.userId?.charAt(0)?.toUpperCase() || 'U'}</Avatar></div>
                      <div>
                        <Typography variant="body1">{req.userEmail || req.userId}</Typography>
                        {req.userEmail && <Typography variant="body2" color="text.secondary">ID: {req.userId}</Typography>}
                      </div>
                    </div>
                    <div className="flex items-center justify-center px-3 py-3"><Chip label={req.category} color="primary" size="small" /></div>
                    <div className="flex items-center justify-center px-3 py-3">
                      <div className="flex flex-wrap items-center justify-center gap-1">
                        {['monday','tuesday','wednesday','thursday','friday'].map((d) => (
                          <span key={d} className="inline-flex rounded border border-[#d9dcef] bg-[#f7f8ff] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-[#5f6c93]">
                            {d.slice(0,3)} {getDayValue(req.dailyQuantities, d)}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="flex items-center justify-center px-3 py-3 text-sm font-semibold text-[#1a1a2e]">{req.totalQuantity ?? (req.quantity ?? 0)}</div>
                    <div className="flex items-center justify-center px-3 py-3"><Chip label={req.status} color={req.status === 'approved' ? 'success' : req.status === 'rejected' ? 'error' : 'warning'} size="small" /></div>
                    <div className="flex items-center justify-center px-3 py-3">
                      {req.status === 'pending' ? (
                        <div className="flex items-center justify-center gap-1">
                          <IconButton size="small" color="success" disabled={!!requestActionLoading[req._id]} onClick={() => handleRequestUpdate(req._id, 'approved')} sx={{ mr: 1 }}><CheckCircleIcon /></IconButton>
                          <IconButton size="small" color="error" disabled={!!requestActionLoading[req._id]} onClick={() => handleRequestUpdate(req._id, 'rejected')}><CancelIcon /></IconButton>
                        </div>
                      ) : (
                        <span className="text-xs text-text-muted">-</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        );
      case 3:
        return (
          <Card>
            <CardContent>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 text-text-primary">
                    <CategoryIcon />
                    <div>
                      <p className="text-base font-semibold">Fixed Category Management</p>
                      <p className="text-xs text-text-secondary">
                        Manage fixed categories and upload fresh datasets in one place.
                      </p>
                    </div>
                  </div>
                </div>
                <Button variant="contained" onClick={() => setAddFixedCategoryDialog({ open: true, name: '' })}>
                  Add New Category
                </Button>
              </div>
                <TableContainer component={Paper} sx={{ mt: 3 }}>
                <Table className="table-fixed">
                  <colgroup>
                    <col className="w-[10%]" />
                    <col className="w-[40%]" />
                    <col className="w-[25%]" />
                    <col className="w-[25%]" />
                  </colgroup>
                  <TableHead className='crm-thead'>
                    <TableRow>
                      <TableCell className="crm-cell-head">S.No</TableCell>
                      <TableCell className="crm-cell-head">Category Name</TableCell>
                      <TableCell className="crm-cell-head">Upload Data</TableCell>
                      <TableCell className="crm-cell-head">Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {fixedCategories.map((cat, index) => (
                      <TableRow key={cat.id} hover>
                        <TableCell>{index + 1}</TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            {editingCategory === cat.id ? (
                              <TextField
                                size="small"
                                value={editCategoryName}
                                onChange={(e) => setEditCategoryName(e.target.value)}
                                onBlur={() => handleSaveCategoryName(cat.id)}
                                onKeyPress={(e) => e.key === 'Enter' && handleSaveCategoryName(cat.id)}
                                autoFocus
                              />
                            ) : (
                              <Typography sx={{ cursor: 'default' }}>{cat.name}</Typography>
                            )}
                            {!editingCategory && (
                              <IconButton size="small" onClick={() => startEditingCategory(cat.id)} aria-label={`edit-${cat.id}`}>
                                <EditIcon fontSize="small" />
                              </IconButton>
                            )}
                          </Box>
                        </TableCell>
                        <TableCell>
                          <input
                            type="file"
                            accept=".xlsx,.xls"
                            onChange={(e) => handleFileSelect(cat.id, e.target.files[0])}
                            style={{ display: 'none' }}
                            id={`upload-${cat.id}`}
                          />
                          <label htmlFor={`upload-${cat.id}`}>
                            <Button variant="outlined" component="span" size="small">
                              Choose File
                            </Button>
                          </label>
                          {uploadCategoryDialog.categoryId === cat.id && uploadCategoryDialog.file && (
                            <Typography variant="body2">{uploadCategoryDialog.file.name}</Typography>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <IconButton
                              size="small"
                              color="primary"
                              onClick={() => handleUploadCategory(cat.id)}
                              disabled={!(uploadCategoryDialog.categoryId === cat.id && uploadCategoryDialog.file)}
                            >
                              <UploadIcon />
                            </IconButton>
                            <IconButton size="small" color="error" onClick={() => setDeleteFixedCategoryDialog({ open: true, category: cat })}>
                              <DeleteIcon />
                            </IconButton>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        );
      case 4:
        return (
          <Card>
            <CardContent>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 text-text-primary">
                    <MonetizationOnIcon />
                    <div>
                      <p className="text-base font-semibold">Completed Purchases</p>
                      <p className="text-xs text-text-secondary">
                        Review finalized sales and fulfillment status.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              <TableContainer component={Paper} sx={{ mt: 2 }}>
                <Table className="table-fixed">
                  <colgroup>
                    <col className="w-[28%]" />
                    <col className="w-[14%]" />
                    <col className="w-[12%]" />
                    <col className="w-[16%]" />
                    <col className="w-[14%]" />
                    <col className="w-[16%]" />
                  </colgroup>
                  <TableHead className='crm-thead'>
                    <TableRow>
                      <TableCell className="crm-cell-head">Customer</TableCell>
                      <TableCell className="crm-cell-head">Category</TableCell>
                      <TableCell className="crm-cell-head">Quantity</TableCell>
                      <TableCell className="crm-cell-head">Total Price</TableCell>
                      <TableCell className="crm-cell-head">Date</TableCell>
                      <TableCell className="crm-cell-head">Status</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {(analytics.recentPurchases || []).map((purchase) => (
                      <TableRow key={purchase._id} hover>
                        <TableCell>
                          <Box display="flex" alignItems="center">
                            <Avatar sx={{ mr: 2, bgcolor: 'primary.main' }}>
                              {purchase.userId?.email?.charAt(0).toUpperCase() || 'U'}
                            </Avatar>
                            {purchase.userId?.email || 'N/A'}
                          </Box>
                        </TableCell>
                        <TableCell>{purchase.category || 'N/A'}</TableCell>
                        <TableCell>{purchase.quantity || 'N/A'}</TableCell>
                        <TableCell>
                          <Typography variant="h6" color="primary">${purchase.totalPrice}</Typography>
                        </TableCell>
                        <TableCell>{new Date(purchase.createdAt).toLocaleDateString()}</TableCell>
                        <TableCell>
                          <Chip label="Completed" color="success" size="small" />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        );
      case 5:
                return (
                    <Card className="crm-card">
                    <CardContent className="space-y-3">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="flex items-start gap-2 text-text-primary">
                        <AnalyticsIcon />
                        <div>
                          <p className="text-base font-semibold">Daily Requirements</p>
                          <p className="text-xs text-text-secondary">
                            Plan weekly requirements and keep uploads aligned.
                          </p>
                        </div>
                      </div>
                    </div>
                    {/* Week picker controls */}
                    <Box className="crm-filter mt-3" sx={{ mb: 2 }}>
                      <Button size="small" variant="outlined" className="crm-btn crm-btn-outline crm-btn-sharp" onClick={() => shiftWeek(-7)}>Prev Week</Button>
                      <Button size="small" variant="outlined" className="crm-btn crm-btn-outline crm-btn-sharp" onClick={() => shiftWeek(7)}>Next Week</Button>
                      <Button size="small" variant="outlined" className="crm-btn crm-btn-outline crm-btn-sharp" onClick={setThisWeek}>This Week</Button>
                      <TextField
                        size="small"
                        label="Week Start"
                        type="date"
                        value={weekStart}
                        onChange={(e) => {
                          const s = e.target.value;
                          const startDate = new Date(s);
                          const { start, end } = getWeekRange(startDate);
                          setWeekStart(start);
                          setWeekEnd(end);
                        }}
                      />
                      <TextField
                        size="small"
                        label="Week End"
                        type="date"
                        value={weekEnd}
                        onChange={(e) => {
                          const eDate = e.target.value;
                          const endDate = new Date(eDate);
                          const { start, end } = getWeekRange(endDate);
                          setWeekStart(start);
                          setWeekEnd(end);
                        }}
                      />
                      <Typography variant="body2" sx={{ ml: 1, color: 'text.secondary' }}>{weekStart && weekEnd ? `${weekStart} → ${weekEnd}` : ''}</Typography>
                    </Box>
                    <div className="overflow-hidden rounded-2xl border border-[#d9dcef] bg-white shadow-sm">
                      <div className="grid grid-cols-[70px_2fr_repeat(5,1fr)_1fr_1.2fr] bg-[#f3f4f8]">
                        {["S.No", "Category Name", "Mon", "Tue", "Wed", "Thu", "Fri", "Total", "Date"].map((h) => (
                          <div key={h} className="px-3 py-3 text-center text-[11px] font-semibold uppercase tracking-[0.1em] text-[#65749c]">
                            {h}
                          </div>
                        ))}
                      </div>

                      {(() => {
                        const fixedCatNames = (fixedCategories || []).map((c) => c.name);
                        const legacyCatNames = (categories || []).map((c) => c.category).filter(Boolean);
                        const validCatNames = new Set([...fixedCatNames, ...legacyCatNames]);
                        const reqNames = Object.keys(dailyRequirements || {});
                        const allNames = Array.from(new Set([...fixedCatNames, ...legacyCatNames, ...reqNames]));
                        const filteredNames = allNames.filter((name) => validCatNames.has(name));

                        return filteredNames.map((name, index) => {
                          const req = dailyRequirements[name] || {};
                          const total =
                            getRequirementDayValue(req, "monday") +
                            getRequirementDayValue(req, "tuesday") +
                            getRequirementDayValue(req, "wednesday") +
                            getRequirementDayValue(req, "thursday") +
                            getRequirementDayValue(req, "friday");
                          return (
                            <div key={name} className="grid grid-cols-[70px_2fr_repeat(5,1fr)_1fr_1.2fr] border-t border-[#e6e8f4] transition-colors hover:bg-[#f8f9ff]">
                              <div className="flex items-center justify-center px-3 py-3 text-sm">{index + 1}</div>
                              <div className="flex items-center gap-2 px-3 py-3">
                                <Avatar>{name?.charAt(0)?.toUpperCase() || "?"}</Avatar>
                                <span className="text-sm text-text-primary">{name}</span>
                              </div>
                              <div className="flex items-center justify-center px-3 py-3 text-sm">{getRequirementDayValue(req, "monday")}</div>
                              <div className="flex items-center justify-center px-3 py-3 text-sm">{getRequirementDayValue(req, "tuesday")}</div>
                              <div className="flex items-center justify-center px-3 py-3 text-sm">{getRequirementDayValue(req, "wednesday")}</div>
                              <div className="flex items-center justify-center px-3 py-3 text-sm">{getRequirementDayValue(req, "thursday")}</div>
                              <div className="flex items-center justify-center px-3 py-3 text-sm">{getRequirementDayValue(req, "friday")}</div>
                              <div className="flex items-center justify-center px-3 py-3 text-sm font-semibold text-accent-success">{total}</div>
                              <div className="flex items-center justify-center px-3 py-3 text-sm">{dailyRequirementsDates[name] || "-"}</div>
                            </div>
                          );
                        });
                      })()}

                      <div className="grid grid-cols-[70px_2fr_repeat(5,1fr)_1fr_1.2fr] border-t border-[#d9dcef] bg-[#f7f8ff]">
                        <div className="px-3 py-3" />
                        <div className="px-3 py-3 text-sm font-semibold text-text-primary">Grand Total</div>
                        <div className="flex items-center justify-center px-3 py-3 text-sm font-semibold">{getRequirementDayValue(dailyRequirementsGrandTotal, "monday")}</div>
                        <div className="flex items-center justify-center px-3 py-3 text-sm font-semibold">{getRequirementDayValue(dailyRequirementsGrandTotal, "tuesday")}</div>
                        <div className="flex items-center justify-center px-3 py-3 text-sm font-semibold">{getRequirementDayValue(dailyRequirementsGrandTotal, "wednesday")}</div>
                        <div className="flex items-center justify-center px-3 py-3 text-sm font-semibold">{getRequirementDayValue(dailyRequirementsGrandTotal, "thursday")}</div>
                        <div className="flex items-center justify-center px-3 py-3 text-sm font-semibold">{getRequirementDayValue(dailyRequirementsGrandTotal, "friday")}</div>
                        <div className="flex items-center justify-center px-3 py-3 text-sm font-semibold text-accent-success">{dailyRequirementsGrandTotal.total || 0}</div>
                        <div className="px-3 py-3" />
                      </div>
                    </div>
                    </CardContent>
                  </Card>
                );
      default:
        return null;
    }
  };

  return (
    <div className="crm-page">
      <section className="crm-section">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="crm-eyebrow">Admin Console</p>
            <h1 className="crm-title">CRM Control Center</h1>
            <p className="crm-subtitle">
              Monitor users, approve requests, and manage data inventory in one place.
            </p>
          </div>
          <div className="crm-actions">
            <button className="crm-btn crm-btn-outline" onClick={openUploadTab}>
              <UploadIcon />
              Upload Data
            </button>
            <button
              className="crm-btn crm-btn-primary"
              onClick={() => {
                logout();
                navigate("/login");
              }}
            >
              <LogoutIcon />
              Logout
            </button>
          </div>
        </div>
        <div className="mt-6 flex flex-wrap gap-2 pb-1">
          {menuItems.map((item) => {
            const active = activeTab === item.tab;
            return (
              <button
                key={item.text}
                type="button"
                onClick={() => setActiveTab(item.tab)}
                className={`crm-tab shrink-0 whitespace-nowrap ${active ? "crm-tab-active" : "crm-tab-idle"}`}
              >
                {item.icon}
                {item.text}
              </button>
            );
          })}
        </div>
      </section>

      <div className="space-y-6">{renderTabContent()}</div>

        {/* Price Update Dialog */}
        <Dialog open={priceDialog.open} onClose={() => setPriceDialog({ open: false, item: null, newPrice: '' })}>
          <DialogTitle sx={{ display: 'flex', alignItems: 'center' }}>
            <EditIcon sx={{ mr: 1 }} />
            Update Price
          </DialogTitle>
          <DialogContent>
            <TextField
              autoFocus
              margin="dense"
              label="New Price"
              type="number"
              fullWidth
              variant="outlined"
              value={priceDialog.newPrice}
              onChange={(e) => setPriceDialog({ ...priceDialog, newPrice: e.target.value })}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setPriceDialog({ open: false, item: null, newPrice: '' })}>Cancel</Button>
            <Button onClick={handlePriceUpdate} variant="contained">Update</Button>
          </DialogActions>
        </Dialog>

        {/* Upload Preview Dialog (parse file, choose day/date, validate) */}
        <Dialog open={uploadDailyPreview.open} onClose={() => setUploadDailyPreview({ open: false, categoryId: null, categoryName: '', file: null, rows: [], dayOfWeek: '', date: '', force: false, requirementQty: null })} maxWidth="md" fullWidth>
          <DialogTitle sx={{ display: 'flex', alignItems: 'center' }}>
            <UploadIcon sx={{ mr: 1 }} />
            Upload Preview - {uploadDailyPreview.categoryName}
          </DialogTitle>
          <DialogContent>
            <Typography variant="body2" sx={{ mb: 1 }}>Rows parsed: {uploadDailyPreview.rows?.length || 0}</Typography>
            {uploadDailyPreview.rows && uploadDailyPreview.rows.length > 0 && (
              <TableContainer component={Paper} sx={{ maxHeight: 300 }}>
                <Table stickyHeader size="small">
                  <TableHead className='crm-thead'>
                    <TableRow>
                      {Object.keys(uploadDailyPreview.rows[0] || {}).slice(0, 8).map((h) => (
                        <TableCell className="crm-cell-head" key={h}>{h}</TableCell>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {uploadDailyPreview.rows.slice(0, 5).map((r, i) => (
                      <TableRow key={i} hover>
                        {Object.values(r).slice(0, 8).map((v, j) => (
                          <TableCell key={j} sx={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{String(v)}</TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}

            <Box sx={{ display: 'flex', gap: 2, mt: 2, alignItems: 'center' }}>
              <Select value={uploadDailyPreview.dayOfWeek} onChange={(e) => setUploadDailyPreview(prev => ({ ...prev, dayOfWeek: e.target.value }))} displayEmpty>
                <MenuItem value="">No specific day</MenuItem>
                <MenuItem value="monday">Monday</MenuItem>
                <MenuItem value="tuesday">Tuesday</MenuItem>
                <MenuItem value="wednesday">Wednesday</MenuItem>
                <MenuItem value="thursday">Thursday</MenuItem>
                <MenuItem value="friday">Friday</MenuItem>
              </Select>
              <TextField type="date" value={uploadDailyPreview.date} onChange={(e) => setUploadDailyPreview(prev => ({ ...prev, date: e.target.value }))} />
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Checkbox checked={uploadDailyPreview.force} onChange={(e) => setUploadDailyPreview(prev => ({ ...prev, force: e.target.checked }))} />
                <Typography variant="body2">Force upload even if counts mismatch</Typography>
              </Box>
            </Box>

            {uploadDailyPreview.requireDay && (!uploadDailyPreview.dayOfWeek || !uploadDailyPreview.date) && (
              <div className="mt-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
                Day and Date are required for uploads initiated from Category Manager.
              </div>
            )}

            {uploadDailyPreview.requirementQty !== null && (
              <div className={`mt-2 rounded-lg border px-3 py-2 text-sm ${
                uploadDailyPreview.requirementQty !== uploadDailyPreview.rows.length
                  ? 'border-amber-200 bg-amber-50 text-amber-700'
                  : 'border-emerald-200 bg-emerald-50 text-emerald-700'
              }`}>
                Required: {uploadDailyPreview.requirementQty} - Uploaded: {uploadDailyPreview.rows.length}
              </div>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setUploadDailyPreview({ open: false, categoryId: null, categoryName: '', file: null, rows: [], dayOfWeek: '', date: '', force: false, requirementQty: null })}>Cancel</Button>
            <Button variant="contained" onClick={handlePreviewUpload}>Upload</Button>
          </DialogActions>
        </Dialog>



        {/* Upload Dialog */}
        <Dialog open={uploadDialog.open} onClose={() => setUploadDialog({ open: false, data: [], file: null, category: '', price: '' })}>
          <DialogTitle sx={{ display: 'flex', alignItems: 'center' }}>
            <UploadIcon sx={{ mr: 1 }} />
            Add Category and Price
          </DialogTitle>
          <DialogContent>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              The uploaded Excel file is missing 'category' and/or 'price' columns. Please provide default values to add to all rows.
            </Typography>
            <TextField
              autoFocus
              margin="dense"
              label="Default Category"
              type="text"
              fullWidth
              variant="outlined"
              value={uploadDialog.category}
              onChange={(e) => setUploadDialog({ ...uploadDialog, category: e.target.value })}
              placeholder="e.g., General"
            />
            <TextField
              margin="dense"
              label="Default Price"
              type="number"
              fullWidth
              variant="outlined"
              value={uploadDialog.price}
              onChange={(e) => setUploadDialog({ ...uploadDialog, price: e.target.value })}
              placeholder="e.g., 10"
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setUploadDialog({ open: false, data: [], file: null, category: '', price: '' })}>Cancel</Button>
            <Button onClick={handleUploadDialogSubmit} variant="contained">Add and Upload</Button>
          </DialogActions>
        </Dialog>

        {/* View Profile Dialog */}
        <Dialog open={viewProfileDialog.open} onClose={() => setViewProfileDialog({ open: false, user: null })}>
          <DialogTitle sx={{ display: 'flex', alignItems: 'center' }}>
            <VisibilityIcon sx={{ mr: 1 }} />
            User Profile Details
          </DialogTitle>
          <DialogContent>
            {viewProfileDialog.user && (
              <Box>
                <Typography variant="h6" gutterBottom>{viewProfileDialog.user.email}</Typography>
                <Typography variant="body1"><strong>Name:</strong> {viewProfileDialog.user.profile?.firstName || ''} {viewProfileDialog.user.profile?.lastName || ''}</Typography>
                <Typography variant="body1"><strong>Company:</strong> {viewProfileDialog.user.profile?.company || 'Not set'}</Typography>
                <Typography variant="body1"><strong>Phone:</strong> {viewProfileDialog.user.profile?.phone || 'Not set'}</Typography>
                <Typography variant="body1"><strong>Address:</strong> {viewProfileDialog.user.profile?.address?.city && viewProfileDialog.user.profile?.address?.country ? `${viewProfileDialog.user.profile.address.city}, ${viewProfileDialog.user.profile.address.country}` : 'Not set'}</Typography>
                <Typography variant="body1"><strong>Status:</strong> {viewProfileDialog.user.status}</Typography>
                <Typography variant="body1"><strong>Role:</strong> {viewProfileDialog.user.role}</Typography>
                <Typography variant="body1"><strong>Joined:</strong> {new Date(viewProfileDialog.user.requestedAt).toLocaleDateString()}</Typography>
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setViewProfileDialog({ open: false, user: null })}>Close</Button>
          </DialogActions>
        </Dialog>

        {/* Edit Profile Dialog */}
        <Dialog open={editProfileDialog.open} onClose={() => setEditProfileDialog({ open: false, user: null, email: '', firstName: '', lastName: '', company: '', phone: '', address: { city: '', country: '' } })}>
          <DialogTitle sx={{ display: 'flex', alignItems: 'center' }}>
            <EditIcon sx={{ mr: 1 }} />
            Edit User Profile
          </DialogTitle>
          <DialogContent>
            <TextField
              autoFocus
              margin="dense"
              label="Email"
              type="email"
              fullWidth
              variant="outlined"
              value={editProfileDialog.email}
              onChange={(e) => setEditProfileDialog({ ...editProfileDialog, email: e.target.value })}
            />
            <TextField
              margin="dense"
              label="First Name"
              type="text"
              fullWidth
              variant="outlined"
              value={editProfileDialog.firstName}
              onChange={(e) => setEditProfileDialog({ ...editProfileDialog, firstName: e.target.value })}
            />
            <TextField
              margin="dense"
              label="Last Name"
              type="text"
              fullWidth
              variant="outlined"
              value={editProfileDialog.lastName}
              onChange={(e) => setEditProfileDialog({ ...editProfileDialog, lastName: e.target.value })}
            />
            <TextField
              margin="dense"
              label="Company"
              type="text"
              fullWidth
              variant="outlined"
              value={editProfileDialog.company}
              onChange={(e) => setEditProfileDialog({ ...editProfileDialog, company: e.target.value })}
            />
            <TextField
              margin="dense"
              label="Phone"
              type="text"
              fullWidth
              variant="outlined"
              value={editProfileDialog.phone}
              onChange={(e) => setEditProfileDialog({ ...editProfileDialog, phone: e.target.value })}
            />
            <TextField
              margin="dense"
              label="Street"
              type="text"
              fullWidth
              variant="outlined"
              value={editProfileDialog.address.street}
              onChange={(e) => setEditProfileDialog({ ...editProfileDialog, address: { ...editProfileDialog.address, street: e.target.value } })}
            />
            <TextField
              margin="dense"
              label="City"
              type="text"
              fullWidth
              variant="outlined"
              value={editProfileDialog.address.city}
              onChange={(e) => setEditProfileDialog({ ...editProfileDialog, address: { ...editProfileDialog.address, city: e.target.value } })}
            />
            <TextField
              margin="dense"
              label="State"
              type="text"
              fullWidth
              variant="outlined"
              value={editProfileDialog.address.state}
              onChange={(e) => setEditProfileDialog({ ...editProfileDialog, address: { ...editProfileDialog.address, state: e.target.value } })}
            />
            <TextField
              margin="dense"
              label="Zip Code"
              type="text"
              fullWidth
              variant="outlined"
              value={editProfileDialog.address.zipCode}
              onChange={(e) => setEditProfileDialog({ ...editProfileDialog, address: { ...editProfileDialog.address, zipCode: e.target.value } })}
            />
            <TextField
              margin="dense"
              label="Country"
              type="text"
              fullWidth
              variant="outlined"
              value={editProfileDialog.address.country}
              onChange={(e) => setEditProfileDialog({ ...editProfileDialog, address: { ...editProfileDialog.address, country: e.target.value } })}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setEditProfileDialog({ open: false, user: null, email: '', firstName: '', lastName: '', company: '', phone: '', address: { city: '', country: '' } })}>Cancel</Button>
            <Button onClick={handleEditProfileSubmit} variant="contained">Update Profile</Button>
          </DialogActions>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog open={deleteConfirmDialog.open} onClose={() => setDeleteConfirmDialog({ open: false, onConfirm: null })}>
          <DialogTitle sx={{ display: 'flex', alignItems: 'center' }}>
            <CancelIcon sx={{ mr: 1, color: 'error.main' }} />
            Confirm Bulk Delete
          </DialogTitle>
          <DialogContent>
            <Typography variant="body1">
              Are you sure you want to delete {selectedUsers.length} selected user(s)? This action cannot be undone.
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDeleteConfirmDialog({ open: false, onConfirm: null })}>Cancel</Button>
            <Button onClick={deleteConfirmDialog.onConfirm} variant="contained" color="error">Delete</Button>
          </DialogActions>
        </Dialog>

        {/* Add Category Dialog */}
        <Dialog open={addCategoryDialog.open} onClose={() => setAddCategoryDialog({ open: false, name: '', price: '' })}>
          <DialogTitle>Add Category</DialogTitle>
          <DialogContent>
            <TextField
              autoFocus
              margin="dense"
              label="Category Name"
              type="text"
              fullWidth
              variant="outlined"
              value={addCategoryDialog.name}
              onChange={(e) => setAddCategoryDialog({ ...addCategoryDialog, name: e.target.value })}
            />
            <TextField
              margin="dense"
              label="Price"
              type="number"
              fullWidth
              variant="outlined"
              value={addCategoryDialog.price}
              onChange={(e) => setAddCategoryDialog({ ...addCategoryDialog, price: e.target.value })}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setAddCategoryDialog({ open: false, name: '', price: '' })}>Cancel</Button>
            <Button onClick={handleAddCategory} variant="contained">Add</Button>
          </DialogActions>
        </Dialog>

        {/* Edit Category Dialog */}
        <Dialog open={categoryDialog.open} onClose={() => setCategoryDialog({ open: false, category: null, newName: '', newPrice: '' })}>
          <DialogTitle>Edit Category</DialogTitle>
          <DialogContent>
            <TextField
              autoFocus
              margin="dense"
              label="Category Name"
              type="text"
              fullWidth
              variant="outlined"
              value={categoryDialog.newName}
              onChange={(e) => setCategoryDialog({ ...categoryDialog, newName: e.target.value })}
            />
            <TextField
              margin="dense"
              label="Price"
              type="number"
              fullWidth
              variant="outlined"
              value={categoryDialog.newPrice}
              onChange={(e) => setCategoryDialog({ ...categoryDialog, newPrice: e.target.value })}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setCategoryDialog({ open: false, category: null, newName: '', newPrice: '' })}>Cancel</Button>
            <Button onClick={handleCategoryUpdate} variant="contained">Update</Button>
          </DialogActions>
        </Dialog>

        {/* Delete Category Dialog */}
        <Dialog open={deleteCategoryDialog.open} onClose={() => setDeleteCategoryDialog({ open: false, category: null })}>
          <DialogTitle>Delete Category</DialogTitle>
          <DialogContent>
            <Typography>Are you sure you want to delete the category "{deleteCategoryDialog.category}"?</Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDeleteCategoryDialog({ open: false, category: null })}>Cancel</Button>
            <Button onClick={handleDeleteCategory} variant="contained" color="error">Delete</Button>
          </DialogActions>
        </Dialog>

        {/* Add Multiple Categories Dialog */}
        <Dialog open={addMultipleCategoriesDialog.open} onClose={() => setAddMultipleCategoriesDialog({ open: false, categories: [] })}>
          <DialogTitle>Add Multiple Categories</DialogTitle>
          <DialogContent>
            {addMultipleCategoriesDialog.categories.map((cat, index) => (
              <Box key={index} sx={{ display: 'flex', gap: 1, mb: 1 }}>
                <TextField
                  label="Name"
                  value={cat.name}
                  onChange={(e) => {
                    const newCats = [...addMultipleCategoriesDialog.categories];
                    newCats[index].name = e.target.value;
                    setAddMultipleCategoriesDialog({ ...addMultipleCategoriesDialog, categories: newCats });
                  }}
                />
                <TextField
                  label="Price"
                  type="number"
                  value={cat.price}
                  onChange={(e) => {
                    const newCats = [...addMultipleCategoriesDialog.categories];
                    newCats[index].price = e.target.value;
                    setAddMultipleCategoriesDialog({ ...addMultipleCategoriesDialog, categories: newCats });
                  }}
                />
                <Button onClick={() => {
                  const newCats = addMultipleCategoriesDialog.categories.filter((_, i) => i !== index);
                  setAddMultipleCategoriesDialog({ ...addMultipleCategoriesDialog, categories: newCats });
                }}>Remove</Button>
              </Box>
            ))}
            <Button onClick={() => setAddMultipleCategoriesDialog({ ...addMultipleCategoriesDialog, categories: [...addMultipleCategoriesDialog.categories, { name: '', price: '' }] })}>Add Another</Button>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setAddMultipleCategoriesDialog({ open: false, categories: [] })}>Cancel</Button>
            <Button onClick={handleAddMultipleCategories} variant="contained">Add All</Button>
          </DialogActions>
        </Dialog>

        {/* Add Fixed Category Dialog */}
        <Dialog open={addFixedCategoryDialog.open} onClose={() => setAddFixedCategoryDialog({ open: false, name: '' })}>
          <DialogTitle>Add Fixed Category</DialogTitle>
          <DialogContent>
            <TextField
              autoFocus
              margin="dense"
              label="Category Name"
              type="text"
              fullWidth
              variant="outlined"
              value={addFixedCategoryDialog.name}
              onChange={(e) => setAddFixedCategoryDialog({ ...addFixedCategoryDialog, name: e.target.value })}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setAddFixedCategoryDialog({ open: false, name: '' })}>Cancel</Button>
            <Button onClick={handleAddFixedCategory} variant="contained">Add</Button>
          </DialogActions>
        </Dialog>

        {/* Delete Fixed Category Confirmation Dialog */}
        <Dialog open={deleteFixedCategoryDialog.open} onClose={() => setDeleteFixedCategoryDialog({ open: false, category: null })}>
          <DialogTitle sx={{ display: 'flex', alignItems: 'center' }}>
            <CancelIcon sx={{ mr: 1, color: 'error.main' }} />
            Confirm Delete Category
          </DialogTitle>
          <DialogContent>
            <Typography>
              Are you sure you want to delete the fixed category "{deleteFixedCategoryDialog.category?.name}"? This will also remove any uploaded data for this category.
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDeleteFixedCategoryDialog({ open: false, category: null })}>Cancel</Button>
            <Button onClick={handleDeleteFixedCategory} variant="contained" color="error">Delete</Button>
          </DialogActions>
        </Dialog>

    </div>
  );
};

export default AdminDashboard;


