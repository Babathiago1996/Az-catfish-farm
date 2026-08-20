"use client";

import { useEffect, useMemo, useState } from "react";

import {
  Plus,
  Boxes,
  ArrowDownToLine,
  ArrowUpFromLine,
  SlidersHorizontal,
  History,
  Trash2,
  Edit3,
  AlertTriangle,
  PackageX,
  RotateCcw,
  Ban,
  Clock3,
  Search,
  X,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  CircleDollarSign,
  Warehouse,
  ArrowDown,
  ArrowUp,
  ArrowRightLeft,
  ReceiptText,
} from "lucide-react";

import { AdminLayout } from "@/components/shared/admin-layout";
import { PageHeader } from "@/components/shared/page-header";
import { MetricCard } from "@/components/shared/metric-card";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Dialog } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { StatusBadge } from "@/components/ui/badge";

import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";

import { api } from "@/lib/api";

import {
  INVENTORY_CATEGORIES,
  INVENTORY_REFERENCE_TYPES,
} from "@/lib/constants";

import { formatCurrency, formatNumber, labelize } from "@/lib/utils";

import { toast } from "sonner";
import { useForm } from "react-hook-form";

/*
|--------------------------------------------------------------------------
| TRANSACTION TYPES
|--------------------------------------------------------------------------
*/

const TRANSACTION_TYPES = [
  "stock_in",
  "stock_out",
  "adjustment",
  "return",
  "damaged",
  "expired",
];

/*
|--------------------------------------------------------------------------
| DEFAULT VALUES
|--------------------------------------------------------------------------
*/

const DEFAULT_ITEM = {
  name: "",
  category: "feed",
  description: "",
  quantity: 0,
  unit: "kg",
  reorderLevel: 0,
  unitCost: 0,
  supplier: "",
  storageLocation: "",
  isActive: true,
  notes: "",
};

const DEFAULT_ACTION = {
  quantity: 1,
  unitCost: "",
  referenceType: "manual",
  referenceId: "",
  notes: "",
};

const DEFAULT_HISTORY = {
  page: 1,
  limit: 25,
  search: "",
  transactionType: "",
  referenceType: "",
  inventoryItem: "",
  startDate: "",
  endDate: "",
};

/*
|--------------------------------------------------------------------------
| TRANSACTION LABEL
|--------------------------------------------------------------------------
*/

const transactionLabel = (type) => {
  const labels = {
    stock_in: "Stock In",
    stock_out: "Stock Out",
    adjustment: "Adjustment",
    return: "Return",
    damaged: "Damaged",
    expired: "Expired",
  };

  return labels[type] || labelize(type || "Unknown");
};

/*
|--------------------------------------------------------------------------
| TRANSACTION DESCRIPTION
|--------------------------------------------------------------------------
*/

const transactionDescription = (type) => {
  const descriptions = {
    stock_in: "Stock added to inventory",
    stock_out: "Stock removed from inventory",
    adjustment: "Physical stock quantity adjusted",
    return: "Stock returned to inventory",
    damaged: "Stock removed because it was damaged",
    expired: "Stock removed because it expired",
  };

  return descriptions[type] || "Inventory movement";
};

/*
|--------------------------------------------------------------------------
| TRANSACTION ICON
|--------------------------------------------------------------------------
*/

const TransactionIcon = ({ type }) => {
  if (type === "stock_in") {
    return <ArrowDown className="h-4 w-4" />;
  }

  if (type === "stock_out") {
    return <ArrowUp className="h-4 w-4" />;
  }

  if (type === "adjustment") {
    return <ArrowRightLeft className="h-4 w-4" />;
  }

  if (type === "return") {
    return <RotateCcw className="h-4 w-4" />;
  }

  if (type === "damaged") {
    return <Ban className="h-4 w-4" />;
  }

  if (type === "expired") {
    return <Clock3 className="h-4 w-4" />;
  }

  return <ReceiptText className="h-4 w-4" />;
};

/*
|--------------------------------------------------------------------------
| TRANSACTION BADGE
|--------------------------------------------------------------------------
*/

const transactionBadgeVariant = (type) => {
  if (type === "stock_in" || type === "return") {
    return "success";
  }

  if (type === "stock_out") {
    return "warning";
  }

  if (type === "damaged" || type === "expired") {
    return "danger";
  }

  return "default";
};

/*
|--------------------------------------------------------------------------
| TRANSACTION DIRECTION
|--------------------------------------------------------------------------
|
| The backend transaction model does not contain a "direction" field.
| We derive it from transactionType.
|
*/

const getTransactionDirection = (type) => {
  if (type === "stock_in" || type === "return") {
    return "in";
  }

  if (type === "stock_out" || type === "damaged" || type === "expired") {
    return "out";
  }

  return "adjustment";
};

/*
|--------------------------------------------------------------------------
| TRANSACTION VALUE
|--------------------------------------------------------------------------
|
| Your backend stores:
|
| quantity
| unitCost
|
| It does NOT store totalValue.
|
| Therefore:
|
| quantity × unitCost
|
*/

const getTransactionValue = (transaction) => {
  const quantity = Number(transaction?.quantity);

  const unitCost = Number(transaction?.unitCost);

  if (!Number.isFinite(quantity)) {
    return 0;
  }

  if (!Number.isFinite(unitCost)) {
    return 0;
  }

  return Math.abs(quantity) * Math.abs(unitCost);
};

/*
|--------------------------------------------------------------------------
| INVENTORY STATUS
|--------------------------------------------------------------------------
*/

const getStatus = (item) => {
  const quantity = Number(item?.quantity || 0);

  const reorderLevel = Number(item?.reorderLevel || 0);

  if (quantity <= 0) {
    return "stockout";
  }

  if (quantity <= reorderLevel) {
    return "low_stock";
  }

  return "healthy";
};

const statusLabel = (status) => {
  if (status === "stockout") {
    return "Stockout";
  }

  if (status === "low_stock") {
    return "Low Stock";
  }

  return "Healthy";
};

const statusClass = (status) => {
  if (status === "stockout") {
    return "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300";
  }

  if (status === "low_stock") {
    return "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300";
  }

  return "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300";
};

/*
|--------------------------------------------------------------------------
| DATE FORMAT
|--------------------------------------------------------------------------
*/

const formatDateTime = (value) => {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return new Intl.DateTimeFormat("en-NG", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
};

/*
|--------------------------------------------------------------------------
| DATE ONLY
|--------------------------------------------------------------------------
*/

const formatDateOnly = (value) => {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toISOString().slice(0, 10);
};

/*
|--------------------------------------------------------------------------
| SAFE ID
|--------------------------------------------------------------------------
|
| Handles:
|
| ObjectId
| string
| populated document
|
*/

const getId = (value) => {
  if (!value) {
    return "";
  }

  if (typeof value === "string") {
    return value;
  }

  if (typeof value === "object") {
    if (value._id) {
      return String(value._id);
    }

    if (value.id) {
      return String(value.id);
    }
  }

  return String(value);
};

/*
|--------------------------------------------------------------------------
| SAFE INVENTORY ITEM NAME
|--------------------------------------------------------------------------
*/

const getTransactionItemName = (transaction, inventoryMap) => {
  const reference = transaction?.inventoryItem;

  if (reference && typeof reference === "object" && reference.name) {
    return reference.name;
  }

  const id = getId(reference);

  if (id && inventoryMap[id]) {
    return inventoryMap[id].name;
  }

  return "Unknown inventory item";
};

/*
|--------------------------------------------------------------------------
| SAFE INVENTORY ITEM
|--------------------------------------------------------------------------
*/

const getTransactionItem = (transaction, inventoryMap) => {
  const reference = transaction?.inventoryItem;

  if (reference && typeof reference === "object" && reference._id) {
    return reference;
  }

  const id = getId(reference);

  if (id && inventoryMap[id]) {
    return inventoryMap[id];
  }

  return null;
};

/*
|--------------------------------------------------------------------------
| NORMALIZE TRANSACTION
|--------------------------------------------------------------------------
|
| This makes every transaction consistent before rendering.
|
*/

const normalizeTransaction = (transaction, inventoryMap) => {
  const type = transaction?.transactionType || "unknown";

  const direction = getTransactionDirection(type);

  const quantity = Number(transaction?.quantity || 0);

  const unitCost = Number(transaction?.unitCost || 0);

  const value = getTransactionValue(transaction);

  const inventoryItem = getTransactionItem(transaction, inventoryMap);

  const inventoryId = getId(transaction?.inventoryItem);

  return {
    ...transaction,

    _id: getId(transaction?._id),

    inventoryItem,

    inventoryItemId: inventoryId,

    inventoryItemName:
      inventoryItem?.name || getTransactionItemName(transaction, inventoryMap),

    inventoryCategory: inventoryItem?.category || "",

    unit: inventoryItem?.unit || "",

    transactionType: type,

    transactionLabel: transactionLabel(type),

    transactionDescription: transactionDescription(type),

    direction,

    quantity,

    unitCost,

    value,

    previousQuantity: Number(transaction?.previousQuantity || 0),

    newQuantity: Number(transaction?.newQuantity || 0),

    referenceType: transaction?.referenceType || "manual",

    referenceId: transaction?.referenceId || null,

    notes: transaction?.notes || "",

    transactionDate:
      transaction?.transactionDate || transaction?.createdAt || null,
  };
};

/*
|--------------------------------------------------------------------------
| FILTER TRANSACTIONS
|--------------------------------------------------------------------------
*/

const filterTransactions = (transactions, filters) => {
  const search = String(filters?.search || "")
    .trim()
    .toLowerCase();

  const transactionType = filters?.transactionType || "";

  const referenceType = filters?.referenceType || "";

  const inventoryItem = filters?.inventoryItem || "";

  const startDate = filters?.startDate || "";

  const endDate = filters?.endDate || "";

  return transactions.filter((transaction) => {
    if (transactionType && transaction.transactionType !== transactionType) {
      return false;
    }

    if (referenceType && transaction.referenceType !== referenceType) {
      return false;
    }

    if (inventoryItem && transaction.inventoryItemId !== inventoryItem) {
      return false;
    }

    if (search) {
      const searchable = [
        transaction.inventoryItemName,
        transaction.inventoryCategory,
        transaction.transactionLabel,
        transaction.transactionDescription,
        transaction.referenceType,
        transaction.referenceId,
        transaction.notes,
        transaction.unit,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      if (!searchable.includes(search)) {
        return false;
      }
    }

    if (startDate) {
      const transactionDate = new Date(transaction.transactionDate);

      const start = new Date(`${startDate}T00:00:00`);

      if (transactionDate < start) {
        return false;
      }
    }

    if (endDate) {
      const transactionDate = new Date(transaction.transactionDate);

      const end = new Date(`${endDate}T23:59:59.999`);

      if (transactionDate > end) {
        return false;
      }
    }

    return true;
  });
};

/*
|--------------------------------------------------------------------------
| SORT TRANSACTIONS
|--------------------------------------------------------------------------
*/

const sortTransactions = (transactions) => {
  return [...transactions].sort((a, b) => {
    const dateA = new Date(a.transactionDate || 0).getTime();

    const dateB = new Date(b.transactionDate || 0).getTime();

    if (dateB !== dateA) {
      return dateB - dateA;
    }

    const createdA = new Date(a.createdAt || 0).getTime();

    const createdB = new Date(b.createdAt || 0).getTime();

    return createdB - createdA;
  });
};

/*
|--------------------------------------------------------------------------
| PAGINATE TRANSACTIONS
|--------------------------------------------------------------------------
*/

const paginateTransactions = (transactions, page, limit) => {
  const safePage = Math.max(Number(page) || 1, 1);

  const safeLimit = Math.max(Number(limit) || 25, 1);

  const total = transactions.length;

  const pages = Math.max(Math.ceil(total / safeLimit), total > 0 ? 1 : 0);

  const start = (safePage - 1) * safeLimit;

  const end = start + safeLimit;

  return {
    rows: transactions.slice(start, end),

    meta: {
      page: safePage,
      limit: safeLimit,
      total,
      pages,
    },
  };
};

/*
|--------------------------------------------------------------------------
| INVENTORY PAGE
|--------------------------------------------------------------------------
*/

export default function Inventory() {
  /*
   * ---------------------------------------------------------
   * INVENTORY STATE
   * ---------------------------------------------------------
   */

  const [rows, setRows] = useState([]);

  const [summary, setSummary] = useState(null);

  const [loading, setLoading] = useState(true);

  /*
   * ---------------------------------------------------------
   * HISTORY STATE
   * ---------------------------------------------------------
   */

  const [allTransactions, setAllTransactions] = useState([]);

  const [history, setHistory] = useState([]);

  const [historyLoading, setHistoryLoading] = useState(false);

  const [historyFilters, setHistoryFilters] = useState(DEFAULT_HISTORY);

  const [historyMeta, setHistoryMeta] = useState({
    page: 1,
    limit: 25,
    total: 0,
    pages: 0,
  });

  /*
   * ---------------------------------------------------------
   * INVENTORY FILTERS
   * ---------------------------------------------------------
   */

  const [filters, setFilters] = useState({
    category: "",
    status: "",
    search: "",
  });

  /*
   * ---------------------------------------------------------
   * DIALOG STATE
   * ---------------------------------------------------------
   */

  const [open, setOpen] = useState(false);

  const [historyOpen, setHistoryOpen] = useState(false);

  const [itemHistoryOpen, setItemHistoryOpen] = useState(false);

  const [mode, setMode] = useState("create");

  const [item, setItem] = useState(null);

  const [historyItem, setHistoryItem] = useState(null);

  /*
   * ---------------------------------------------------------
   * FORMS
   * ---------------------------------------------------------
   */

  const form = useForm({
    defaultValues: DEFAULT_ITEM,
  });

  const actionForm = useForm({
    defaultValues: DEFAULT_ACTION,
  });

  /*
   * ---------------------------------------------------------
   * LOAD INVENTORY
   * ---------------------------------------------------------
   */

  const loadInventory = async () => {
    try {
      setLoading(true);

      const [inventoryResponse, summaryResponse] = await Promise.all([
        api.inventory.list({
          category: filters.category || undefined,

          search: filters.search || undefined,

          lowStock: filters.status === "low_stock" ? "true" : undefined,
        }),

        api.inventory.summary(),
      ]);

      let inventoryRows = Array.isArray(inventoryResponse)
        ? inventoryResponse
        : [];

      /*
       * The backend supports lowStock,
       * but not a dedicated "stockout"
       * or "healthy" filter.
       *
       * Apply those two locally.
       */

      if (filters.status === "stockout") {
        inventoryRows = inventoryRows.filter(
          (inventoryItem) => Number(inventoryItem.quantity || 0) <= 0,
        );
      }

      if (filters.status === "healthy") {
        inventoryRows = inventoryRows.filter(
          (inventoryItem) =>
            Number(inventoryItem.quantity || 0) >
            Number(inventoryItem.reorderLevel || 0),
        );
      }

      setRows(inventoryRows);

      setSummary(summaryResponse || null);

      return inventoryRows;
    } catch (error) {
      toast.error(error?.message || "Unable to load inventory.");

      return [];
    } finally {
      setLoading(false);
    }
  };

  /*
   * ---------------------------------------------------------
   * LOAD ALL TRANSACTIONS
   * ---------------------------------------------------------
   *
   * IMPORTANT:
   *
   * Your backend currently exposes:
   *
   * GET /inventory/:id/transactions
   *
   * It does NOT expose:
   *
   * GET /inventory/transactions
   *
   * Therefore we retrieve the active inventory items
   * and then retrieve the history of each item.
   *
   */

  const loadAllTransactions = async () => {
    try {
      setHistoryLoading(true);

      /*
       * Always retrieve the complete active inventory list.
       *
       * Do NOT use the current inventory table filters here,
       * because transaction history must contain historical
       * transactions for every inventory item.
       */

      const inventoryResponse = await api.inventory.list({});

      const inventoryItems = Array.isArray(inventoryResponse)
        ? inventoryResponse
        : [];

      /*
       * Build an inventory lookup map.
       */

      const inventoryMap = inventoryItems.reduce((map, inventoryItem) => {
        const id = getId(inventoryItem?._id);

        if (id) {
          map[id] = inventoryItem;
        }

        return map;
      }, {});

      /*
       * No inventory means no transactions.
       */

      if (!inventoryItems.length) {
        setAllTransactions([]);
        setHistory([]);
        setHistoryMeta({
          page: 1,
          limit: historyFilters.limit || 25,
          total: 0,
          pages: 0,
        });

        return [];
      }

      /*
       * Retrieve every item's transaction history.
       *
       * Your backend accepts a maximum limit of 200,
       * so we request 200 records per inventory item.
       */

      const transactionResponses = await Promise.all(
        inventoryItems.map(async (inventoryItem) => {
          const id = getId(inventoryItem?._id);

          if (!id) {
            return [];
          }

          try {
            const response = await api.inventory.transactions(id, {
              page: 1,
              limit: 200,
            });

            /*
             * Depending on your api-client
             * unwrapPaginated implementation,
             * this may be:
             *
             * array
             *
             * or:
             *
             * {
             *   transactions,
             *   pagination
             * }
             */

            if (Array.isArray(response)) {
              return response;
            }

            if (Array.isArray(response?.transactions)) {
              return response.transactions;
            }

            return [];
          } catch (error) {
            /*
             * One bad item should not prevent
             * the entire inventory history from
             * displaying.
             */

            console.error(
              `Unable to load transaction history for inventory item ${id}:`,
              error,
            );

            return [];
          }
        }),
      );

      /*
       * Flatten all transaction arrays.
       */

      const combined = transactionResponses.flat();

      /*
       * Normalize every transaction.
       */

      const normalized = combined.map((transaction) =>
        normalizeTransaction(transaction, inventoryMap),
      );

      /*
       * Sort newest first.
       */

      const sorted = sortTransactions(normalized);

      setAllTransactions(sorted);

      /*
       * Apply current filters.
       */

      const filtered = filterTransactions(sorted, historyFilters);

      /*
       * Paginate.
       */

      const paginated = paginateTransactions(
        filtered,
        historyFilters.page,
        historyFilters.limit,
      );

      setHistory(paginated.rows);

      setHistoryMeta(paginated.meta);

      return sorted;
    } catch (error) {
      console.error("Unable to load all inventory transactions:", error);

      toast.error(error?.message || "Unable to load transaction history.");

      setAllTransactions([]);
      setHistory([]);

      setHistoryMeta({
        page: 1,
        limit: historyFilters.limit || 25,
        total: 0,
        pages: 0,
      });

      return [];
    } finally {
      setHistoryLoading(false);
    }
  };

  /*
   * ---------------------------------------------------------
   * LOAD ITEM HISTORY
   * ---------------------------------------------------------
   */

  const loadItemHistory = async (inventoryItem) => {
    try {
      setHistoryLoading(true);

      const id = getId(inventoryItem?._id);

      if (!id) {
        toast.error("This inventory item does not have a valid ID.");

        return;
      }

      /*
       * IMPORTANT:
       *
       * Pass the actual string ID.
       *
       * Never pass the complete item object.
       */

      const response = await api.inventory.transactions(id, {
        page: 1,
        limit: 200,
      });

      let transactions = Array.isArray(response)
        ? response
        : Array.isArray(response?.transactions)
          ? response.transactions
          : [];

      const inventoryMap = {
        [id]: inventoryItem,
      };

      const normalized = transactions.map((transaction) =>
        normalizeTransaction(transaction, inventoryMap),
      );

      const sorted = sortTransactions(normalized);

      setHistory(sorted);

      setHistoryMeta({
        page: 1,
        limit: 200,
        total: sorted.length,
        pages: sorted.length > 0 ? 1 : 0,
      });
    } catch (error) {
      console.error("Unable to load item transaction history:", error);

      toast.error(error?.message || "Unable to load item transaction history.");

      setHistory([]);
    } finally {
      setHistoryLoading(false);
    }
  };

  /*
   * ---------------------------------------------------------
   * INITIAL LOAD
   * ---------------------------------------------------------
   */

  useEffect(() => {
    loadInventory();
  }, [filters.category, filters.status, filters.search]);

  /*
   * Load transaction history once
   * when the page opens.
   */

  useEffect(() => {
    loadAllTransactions();
  }, []);

  /*
   * ---------------------------------------------------------
   * APPLY HISTORY FILTERS LOCALLY
   * ---------------------------------------------------------
   *
   * Because the backend currently exposes only
   * item-specific transaction history, filtering
   * the combined history on the frontend is the
   * safest approach.
   */

  useEffect(() => {
    if (historyOpen || allTransactions.length) {
      const filtered = filterTransactions(allTransactions, historyFilters);

      const paginated = paginateTransactions(
        filtered,
        historyFilters.page,
        historyFilters.limit,
      );

      setHistory(paginated.rows);

      setHistoryMeta(paginated.meta);
    }
  }, [allTransactions, historyFilters]);

  /*
   * ---------------------------------------------------------
   * CREATE / UPDATE INVENTORY
   * ---------------------------------------------------------
   */

  const submit = async (data) => {
    try {
      const payload = {
        ...data,

        quantity: Number(data.quantity || 0),

        reorderLevel: Number(data.reorderLevel || 0),

        unitCost: Number(data.unitCost || 0),
      };

      if (mode === "create") {
        await api.inventory.create(payload);
      } else {
        /*
         * Quantity must never be changed
         * through PATCH.
         *
         * Stock movement must go through
         * stock-in, stock-out or adjustment.
         */

        delete payload.quantity;

        if (!item?._id) {
          throw new Error("Invalid inventory item.");
        }

        await api.inventory.update(item._id, payload);
      }

      toast.success(
        mode === "create"
          ? "Inventory item created successfully."
          : "Inventory item updated successfully.",
      );

      setOpen(false);

      setItem(null);

      form.reset(DEFAULT_ITEM);

      await loadInventory();

      /*
       * If opening quantity was greater than zero,
       * the backend automatically creates an initial
       * stock-in transaction.
       *
       * Refresh history so it appears immediately.
       */

      await loadAllTransactions();
    } catch (error) {
      toast.error(error?.message || "Unable to save inventory item.");
    }
  };

  /*
   * ---------------------------------------------------------
   * OPEN CREATE
   * ---------------------------------------------------------
   */

  const openCreate = () => {
    setMode("create");

    setItem(null);

    form.reset(DEFAULT_ITEM);

    setOpen(true);
  };

  /*
   * ---------------------------------------------------------
   * OPEN EDIT
   * ---------------------------------------------------------
   */

  const openEdit = (inventoryItem) => {
    setItem(inventoryItem);

    setMode("edit");

    form.reset({
      ...DEFAULT_ITEM,
      ...inventoryItem,
    });

    setOpen(true);
  };

  /*
   * ---------------------------------------------------------
   * OPEN STOCK ACTION
   * ---------------------------------------------------------
   */

  const openAction = (inventoryItem, actionMode) => {
    setItem(inventoryItem);

    setMode(actionMode);

    actionForm.reset(DEFAULT_ACTION);

    setOpen(true);
  };

  /*
   * ---------------------------------------------------------
   * SUBMIT STOCK ACTION
   * ---------------------------------------------------------
   */

  const submitAction = async (data) => {
    try {
      if (!item?._id) {
        throw new Error("Invalid inventory item.");
      }

      const quantity = Number(data.quantity);

      if (!Number.isFinite(quantity) || quantity < 0) {
        throw new Error("Please enter a valid quantity.");
      }

      /*
       * -------------------------------------------------
       * STOCK IN
       * -------------------------------------------------
       */

      if (mode === "in") {
        if (quantity <= 0) {
          throw new Error("Stock-in quantity must be greater than zero.");
        }

        const payload = {
          quantity,

          notes: data.notes?.trim() || "",

          referenceType: data.referenceType || "manual",
        };

        if (data.unitCost !== "" && data.unitCost !== undefined) {
          const unitCost = Number(data.unitCost);

          if (!Number.isFinite(unitCost) || unitCost < 0) {
            throw new Error("Please enter a valid unit cost.");
          }

          payload.unitCost = unitCost;
        }

        if (data.referenceId?.trim()) {
          payload.referenceId = data.referenceId.trim();
        }

        await api.inventory.stockIn(item._id, payload);
      }

      /*
       * -------------------------------------------------
       * STOCK OUT
       * -------------------------------------------------
       */

      if (mode === "out") {
        if (quantity <= 0) {
          throw new Error("Stock-out quantity must be greater than zero.");
        }

        const payload = {
          quantity,

          notes: data.notes?.trim() || "",

          referenceType: data.referenceType || "manual",
        };

        if (data.referenceId?.trim()) {
          payload.referenceId = data.referenceId.trim();
        }

        await api.inventory.stockOut(item._id, payload);
      }

      /*
       * -------------------------------------------------
       * ADJUSTMENT
       * -------------------------------------------------
       */

      if (mode === "adjust") {
        const payload = {
          quantity,

          notes: data.notes?.trim() || "",
        };

        await api.inventory.adjust(item._id, payload);
      }

      /*
       * -------------------------------------------------
       * SAFETY CHECK
       * -------------------------------------------------
       *
       * This page intentionally does NOT call:
       *
       * api.inventory.returnStock()
       * api.inventory.damaged()
       * api.inventory.expired()
       *
       * because those endpoints do not exist in
       * the API code you supplied.
       */

      toast.success(
        mode === "in"
          ? "Stock added successfully."
          : mode === "out"
            ? "Stock deducted successfully."
            : "Inventory quantity adjusted successfully.",
      );

      setOpen(false);

      setItem(null);

      actionForm.reset(DEFAULT_ACTION);

      await loadInventory();

      /*
       * Reload the complete history.
       *
       * This makes the newly created transaction
       * immediately visible.
       */

      await loadAllTransactions();
    } catch (error) {
      toast.error(error?.message || "Unable to update inventory quantity.");
    }
  };

  /*
   * ---------------------------------------------------------
   * REMOVE / DEACTIVATE
   * ---------------------------------------------------------
   */

  const remove = async (id) => {
    const confirmed = window.confirm(
      "Deactivate this inventory item? Its transaction history will be retained permanently.",
    );

    if (!confirmed) {
      return;
    }

    try {
      await api.inventory.remove(id);

      toast.success("Inventory item deactivated.");

      await loadInventory();

      await loadAllTransactions();
    } catch (error) {
      toast.error(error?.message || "Unable to deactivate inventory item.");
    }
  };

  /*
   * ---------------------------------------------------------
   * OPEN GLOBAL HISTORY
   * ---------------------------------------------------------
   */

  const openGlobalHistory = async () => {
    const resetFilters = {
      ...DEFAULT_HISTORY,
    };

    setHistoryFilters(resetFilters);

    setHistoryOpen(true);

    /*
     * Refresh from backend so this
     * dialog always contains the latest data.
     */

    await loadAllTransactions();
  };

  /*
   * ---------------------------------------------------------
   * OPEN ITEM HISTORY
   * ---------------------------------------------------------
   */

  const openItemHistory = async (inventoryItem) => {
    setHistoryItem(inventoryItem);

    setItemHistoryOpen(true);

    await loadItemHistory(inventoryItem);
  };

  /*
   * ---------------------------------------------------------
   * HISTORY PAGE
   * ---------------------------------------------------------
   */

  const changeHistoryPage = (page) => {
    setHistoryFilters((current) => ({
      ...current,
      page,
    }));
  };

  /*
   * ---------------------------------------------------------
   * APPLY HISTORY FILTERS
   * ---------------------------------------------------------
   */

  const applyHistoryFilters = () => {
    setHistoryFilters((current) => ({
      ...current,
      page: 1,
    }));
  };

  /*
   * ---------------------------------------------------------
   * RESET HISTORY FILTERS
   * ---------------------------------------------------------
   */

  const resetHistoryFilters = () => {
    setHistoryFilters({
      ...DEFAULT_HISTORY,
    });
  };

  /*
   * ---------------------------------------------------------
   * COMPUTED INVENTORY VALUE
   * ---------------------------------------------------------
   */

  const calculatedInventoryValue = useMemo(() => {
    return rows.reduce((total, inventoryItem) => {
      const quantity = Number(inventoryItem?.quantity || 0);

      const unitCost = Number(inventoryItem?.unitCost || 0);

      return total + quantity * unitCost;
    }, 0);
  }, [rows]);

  /*
   * ---------------------------------------------------------
   * TRANSACTION SUMMARY
   * ---------------------------------------------------------
   */

  const transactionSummary = useMemo(() => {
    return history.reduce(
      (result, transaction) => {
        const value = Number(transaction.value || 0);

        result.totalValue += value;

        result.totalQuantity += Number(transaction.quantity || 0);

        if (transaction.transactionType === "stock_in") {
          result.stockIn += Number(transaction.quantity || 0);

          result.stockInValue += value;
        }

        if (transaction.transactionType === "stock_out") {
          result.stockOut += Number(transaction.quantity || 0);

          result.stockOutValue += value;
        }

        if (transaction.transactionType === "adjustment") {
          result.adjustment += Number(transaction.quantity || 0);

          result.adjustmentValue += value;
        }

        if (transaction.transactionType === "return") {
          result.returns += Number(transaction.quantity || 0);
        }

        if (transaction.transactionType === "damaged") {
          result.damaged += Number(transaction.quantity || 0);
        }

        if (transaction.transactionType === "expired") {
          result.expired += Number(transaction.quantity || 0);
        }

        return result;
      },
      {
        totalValue: 0,
        totalQuantity: 0,

        stockIn: 0,
        stockInValue: 0,

        stockOut: 0,
        stockOutValue: 0,

        adjustment: 0,
        adjustmentValue: 0,

        returns: 0,
        damaged: 0,
        expired: 0,
      },
    );
  }, [history]);

  /*
   * ---------------------------------------------------------
   * RENDER
   * ---------------------------------------------------------
   */

  return (
    <AdminLayout
      title="Inventory"
      description="Manage feed, medicine, equipment and every stock movement."
    >
      <PageHeader
        eyebrow="Business"
        title="Inventory"
        description="Monitor stock levels, reorder points, inventory value and the complete movement history of your farm."
        action={{
          label: "Add item",
          icon: <Plus className="h-4 w-4" />,
          onClick: openCreate,
        }}
      />

      {/* =====================================================
          SUMMARY
          ===================================================== */}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Inventory items"
          value={formatNumber(summary?.totalItems ?? rows.length)}
          icon={Boxes}
        />

        <MetricCard
          label="Stock value"
          value={formatCurrency(
            summary?.totalValue ?? calculatedInventoryValue,
          )}
          icon={CircleDollarSign}
        />

        <MetricCard
          label="Low stock"
          value={formatNumber(
            summary?.lowStockItems ??
              rows.filter(
                (inventoryItem) =>
                  Number(inventoryItem.quantity || 0) <=
                  Number(inventoryItem.reorderLevel || 0),
              ).length,
          )}
          sub="At or below reorder level"
          icon={AlertTriangle}
        />

        <MetricCard
          label="Stockouts"
          value={formatNumber(
            rows.filter(
              (inventoryItem) => Number(inventoryItem.quantity || 0) <= 0,
            ).length,
          )}
          sub="Items currently at zero"
          icon={PackageX}
        />
      </div>

      {/* =====================================================
          INVENTORY ITEMS
          ===================================================== */}

      <Card className="mt-6 overflow-hidden">
        <div className="border-b p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-lg font-black">Inventory items</h2>

              <p className="mt-1 text-sm text-[var(--muted)]">
                Current quantities, reorder thresholds, stock values and
                inventory status.
              </p>
            </div>

            <Button
              variant="outline"
              onClick={async () => {
                await loadInventory();
                await loadAllTransactions();
              }}
              disabled={loading || historyLoading}
            >
              <RefreshCw
                className={`mr-2 h-4 w-4 ${
                  loading || historyLoading ? "animate-spin" : ""
                }`}
              />
              Refresh
            </Button>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-[1fr_180px_180px]">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]" />

              <Input
                value={filters.search}
                onChange={(event) =>
                  setFilters((current) => ({
                    ...current,
                    search: event.target.value,
                  }))
                }
                placeholder="Search inventory, supplier or location..."
                className="pl-10"
              />
            </div>

            <Select
              value={filters.category}
              onChange={(event) =>
                setFilters((current) => ({
                  ...current,
                  category: event.target.value,
                }))
              }
            >
              <option value="">All categories</option>

              {INVENTORY_CATEGORIES.map((category) => (
                <option key={category} value={category}>
                  {labelize(category)}
                </option>
              ))}
            </Select>

            <Select
              value={filters.status}
              onChange={(event) =>
                setFilters((current) => ({
                  ...current,
                  status: event.target.value,
                }))
              }
            >
              <option value="">All stock status</option>

              <option value="healthy">Healthy</option>

              <option value="low_stock">Low Stock</option>

              <option value="stockout">Stockout</option>
            </Select>
          </div>
        </div>

        <div className="overflow-x-auto">
          {loading ? (
            <div className="py-16 text-center text-sm text-[var(--muted)]">
              Loading inventory...
            </div>
          ) : rows.length ? (
            <Table>
              <THead>
                <TR>
                  <TH>Item</TH>

                  <TH>Category</TH>

                  <TH>Quantity</TH>

                  <TH>Reorder</TH>

                  <TH>Unit cost</TH>

                  <TH>Stock value</TH>

                  <TH>Status</TH>

                  <TH className="text-right">Actions</TH>
                </TR>
              </THead>

              <TBody>
                {rows.map((row) => {
                  const status = getStatus(row);

                  const value =
                    Number(row.quantity || 0) * Number(row.unitCost || 0);

                  return (
                    <TR key={row._id}>
                      <TD>
                        <div className="font-bold">{row.name}</div>

                        <div className="mt-1 text-xs text-[var(--muted)]">
                          {row.storageLocation || "No storage location"}

                          {row.supplier ? ` • ${row.supplier}` : ""}
                        </div>
                      </TD>

                      <TD>{labelize(row.category)}</TD>

                      <TD>
                        <span
                          className={
                            status === "stockout"
                              ? "font-black text-red-600"
                              : status === "low_stock"
                                ? "font-black text-amber-600"
                                : "font-bold"
                          }
                        >
                          {formatNumber(row.quantity, 2)} {row.unit}
                        </span>
                      </TD>

                      <TD>
                        {formatNumber(row.reorderLevel, 2)} {row.unit}
                      </TD>

                      <TD>{formatCurrency(row.unitCost || 0)}</TD>

                      <TD>
                        <span className="font-bold">
                          {formatCurrency(value)}
                        </span>
                      </TD>

                      <TD>
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${statusClass(
                            status,
                          )}`}
                        >
                          {statusLabel(status)}
                        </span>
                      </TD>

                      <TD>
                        <div className="flex justify-end gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            title="Transaction history"
                            onClick={() => openItemHistory(row)}
                          >
                            <History className="h-4 w-4" />
                          </Button>

                          <Button
                            size="icon"
                            variant="ghost"
                            title="Stock in"
                            onClick={() => openAction(row, "in")}
                          >
                            <ArrowDownToLine className="h-4 w-4 text-emerald-600" />
                          </Button>

                          <Button
                            size="icon"
                            variant="ghost"
                            title="Stock out"
                            onClick={() => openAction(row, "out")}
                          >
                            <ArrowUpFromLine className="h-4 w-4 text-amber-600" />
                          </Button>

                          <Button
                            size="icon"
                            variant="ghost"
                            title="Adjust quantity"
                            onClick={() => openAction(row, "adjust")}
                          >
                            <SlidersHorizontal className="h-4 w-4" />
                          </Button>

                          <Button
                            size="icon"
                            variant="ghost"
                            title="Edit item"
                            onClick={() => openEdit(row)}
                          >
                            <Edit3 className="h-4 w-4" />
                          </Button>

                          <Button
                            size="icon"
                            variant="ghost"
                            title="Deactivate item"
                            onClick={() => remove(row._id)}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      </TD>
                    </TR>
                  );
                })}
              </TBody>
            </Table>
          ) : (
            <div className="py-16 text-center">
              <Warehouse className="mx-auto h-10 w-10 text-[var(--muted)]" />

              <h3 className="mt-3 font-bold">No inventory items found</h3>

              <p className="mt-1 text-sm text-[var(--muted)]">
                Add your first inventory item or change the current filters.
              </p>
            </div>
          )}
        </div>
      </Card>

      {/* =====================================================
          TRANSACTION HISTORY
          ===================================================== */}

      <Card className="mt-6 overflow-hidden">
        <div className="border-b p-5">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <History className="h-5 w-5" />

                <h2 className="text-lg font-black">
                  Inventory transaction history
                </h2>
              </div>

              <p className="mt-1 text-sm text-[var(--muted)]">
                Complete audit trail of inventory movements across the farm.
              </p>
            </div>

            <Button variant="outline" onClick={openGlobalHistory}>
              <History className="mr-2 h-4 w-4" />
              View full history
            </Button>
          </div>

          {/* =================================================
              TRANSACTION SUMMARY
              ================================================= */}

          <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            <div className="rounded-2xl border p-4">
              <div className="text-xs font-medium text-[var(--muted)]">
                Transactions shown
              </div>

              <div className="mt-1 text-xl font-black">
                {formatNumber(historyMeta.total || 0)}
              </div>
            </div>

            <div className="rounded-2xl border p-4">
              <div className="text-xs font-medium text-[var(--muted)]">
                Stock In
              </div>

              <div className="mt-1 font-black text-emerald-600">
                +{formatNumber(transactionSummary.stockIn, 2)}
              </div>

              <div className="mt-1 text-xs text-[var(--muted)]">
                {formatCurrency(transactionSummary.stockInValue)}
              </div>
            </div>

            <div className="rounded-2xl border p-4">
              <div className="text-xs font-medium text-[var(--muted)]">
                Stock Out
              </div>

              <div className="mt-1 font-black text-red-600">
                -{formatNumber(transactionSummary.stockOut, 2)}
              </div>

              <div className="mt-1 text-xs text-[var(--muted)]">
                {formatCurrency(transactionSummary.stockOutValue)}
              </div>
            </div>

            <div className="rounded-2xl border p-4">
              <div className="text-xs font-medium text-[var(--muted)]">
                Adjustments
              </div>

              <div className="mt-1 font-black">
                {formatNumber(transactionSummary.adjustment, 2)}
              </div>

              <div className="mt-1 text-xs text-[var(--muted)]">
                {formatCurrency(transactionSummary.adjustmentValue)}
              </div>
            </div>

            <div className="rounded-2xl border p-4">
              <div className="text-xs font-medium text-[var(--muted)]">
                Movement value
              </div>

              <div className="mt-1 font-black">
                {formatCurrency(transactionSummary.totalValue)}
              </div>
            </div>
          </div>

          {/* =================================================
              FILTERS
              ================================================= */}

          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]" />

              <Input
                value={historyFilters.search}
                onChange={(event) =>
                  setHistoryFilters((current) => ({
                    ...current,
                    search: event.target.value,
                    page: 1,
                  }))
                }
                placeholder="Search transactions..."
                className="pl-10"
              />
            </div>

            <Select
              value={historyFilters.transactionType}
              onChange={(event) =>
                setHistoryFilters((current) => ({
                  ...current,
                  transactionType: event.target.value,
                  page: 1,
                }))
              }
            >
              <option value="">All transaction types</option>

              {TRANSACTION_TYPES.map((type) => (
                <option key={type} value={type}>
                  {transactionLabel(type)}
                </option>
              ))}
            </Select>

            <Select
              value={historyFilters.referenceType}
              onChange={(event) =>
                setHistoryFilters((current) => ({
                  ...current,
                  referenceType: event.target.value,
                  page: 1,
                }))
              }
            >
              <option value="">All references</option>

              {INVENTORY_REFERENCE_TYPES.map((reference) => (
                <option key={reference} value={reference}>
                  {labelize(reference)}
                </option>
              ))}
            </Select>

            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={resetHistoryFilters}
              >
                <X className="mr-2 h-4 w-4" />
                Reset
              </Button>

              <Button className="flex-1" onClick={applyHistoryFilters}>
                <Search className="mr-2 h-4 w-4" />
                Filter
              </Button>
            </div>
          </div>
        </div>

        {/* ===================================================
            HISTORY TABLE
            =================================================== */}

        <div className="overflow-x-auto">
          {historyLoading ? (
            <div className="py-14 text-center text-sm text-[var(--muted)]">
              Loading transaction history...
            </div>
          ) : history.length ? (
            <Table>
              <THead>
                <TR>
                  <TH>Date</TH>

                  <TH>Item</TH>

                  <TH>Transaction</TH>

                  <TH>Quantity</TH>

                  <TH>Before</TH>

                  <TH>After</TH>

                  <TH>Unit Cost</TH>

                  <TH>Transaction Value</TH>

                  <TH>Reference</TH>

                  <TH>Notes</TH>
                </TR>
              </THead>

              <TBody>
                {history.map((transaction) => {
                  const direction = transaction.direction;

                  return (
                    <TR key={transaction._id}>
                      {/* DATE */}

                      <TD className="whitespace-nowrap">
                        <div className="font-medium">
                          {formatDateTime(transaction.transactionDate)}
                        </div>
                      </TD>

                      {/* ITEM */}

                      <TD>
                        <div className="font-bold">
                          {transaction.inventoryItemName}
                        </div>

                        <div className="mt-1 text-xs text-[var(--muted)]">
                          {transaction.inventoryCategory
                            ? labelize(transaction.inventoryCategory)
                            : "Inventory"}

                          {transaction.unit ? ` • ${transaction.unit}` : ""}
                        </div>
                      </TD>

                      {/* TRANSACTION TYPE */}

                      <TD>
                        <div className="flex min-w-[150px] items-center gap-2">
                          <span
                            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                              transaction.transactionType === "stock_in"
                                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
                                : transaction.transactionType === "stock_out"
                                  ? "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300"
                                  : transaction.transactionType === "damaged" ||
                                      transaction.transactionType === "expired"
                                    ? "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300"
                                    : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                            }`}
                          >
                            <TransactionIcon
                              type={transaction.transactionType}
                            />
                          </span>

                          <div>
                            <StatusBadge
                              variant={transactionBadgeVariant(
                                transaction.transactionType,
                              )}
                            >
                              {transaction.transactionLabel}
                            </StatusBadge>

                            <div className="mt-1 whitespace-nowrap text-xs text-[var(--muted)]">
                              {transaction.transactionDescription}
                            </div>
                          </div>
                        </div>
                      </TD>

                      {/* QUANTITY */}

                      <TD>
                        <span
                          className={
                            direction === "in"
                              ? "whitespace-nowrap font-black text-emerald-600"
                              : direction === "out"
                                ? "whitespace-nowrap font-black text-red-600"
                                : "whitespace-nowrap font-black"
                          }
                        >
                          {direction === "in"
                            ? "+"
                            : direction === "out"
                              ? "-"
                              : ""}

                          {formatNumber(transaction.quantity, 2)}

                          {transaction.unit ? ` ${transaction.unit}` : ""}
                        </span>
                      </TD>

                      {/* BEFORE */}

                      <TD>
                        <span className="whitespace-nowrap">
                          {formatNumber(transaction.previousQuantity, 2)}

                          {transaction.unit ? ` ${transaction.unit}` : ""}
                        </span>
                      </TD>

                      {/* AFTER */}

                      <TD>
                        <span className="whitespace-nowrap font-bold">
                          {formatNumber(transaction.newQuantity, 2)}

                          {transaction.unit ? ` ${transaction.unit}` : ""}
                        </span>
                      </TD>

                      {/* UNIT COST */}

                      <TD>
                        <span className="whitespace-nowrap font-semibold">
                          {formatCurrency(transaction.unitCost)}
                        </span>
                      </TD>

                      {/* TRANSACTION VALUE */}

                      <TD>
                        <div className="whitespace-nowrap font-black">
                          {formatCurrency(transaction.value)}
                        </div>

                        <div className="mt-1 text-xs text-[var(--muted)]">
                          {formatNumber(transaction.quantity, 2)} ×{" "}
                          {formatCurrency(transaction.unitCost)}
                        </div>
                      </TD>

                      {/* REFERENCE */}

                      <TD>
                        <div className="font-semibold">
                          {labelize(transaction.referenceType || "manual")}
                        </div>

                        {transaction.referenceId ? (
                          <div className="mt-1 max-w-[180px] truncate font-mono text-[10px] text-[var(--muted)]">
                            {transaction.referenceId}
                          </div>
                        ) : null}
                      </TD>

                      {/* NOTES */}

                      <TD>
                        <div className="max-w-[220px] text-xs text-[var(--muted)]">
                          {transaction.notes || "No notes"}
                        </div>
                      </TD>
                    </TR>
                  );
                })}
              </TBody>
            </Table>
          ) : (
            <div className="py-14 text-center">
              <History className="mx-auto h-10 w-10 text-[var(--muted)]" />

              <h3 className="mt-3 font-bold">
                No inventory transactions found
              </h3>

              <p className="mx-auto mt-1 max-w-md text-sm text-[var(--muted)]">
                Transactions will appear here automatically whenever stock is
                added, removed or adjusted.
              </p>
            </div>
          )}
        </div>

        {/* ===================================================
            PAGINATION
            =================================================== */}

        {historyMeta.pages > 1 ? (
          <div className="flex items-center justify-between border-t p-4">
            <p className="text-sm text-[var(--muted)]">
              Showing page {historyMeta.page} of {historyMeta.pages} •{" "}
              {formatNumber(historyMeta.total)} transactions
            </p>

            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                disabled={historyMeta.page <= 1}
                onClick={() => changeHistoryPage(historyMeta.page - 1)}
              >
                <ChevronLeft className="mr-1 h-4 w-4" />
                Previous
              </Button>

              <Button
                size="sm"
                variant="outline"
                disabled={historyMeta.page >= historyMeta.pages}
                onClick={() => changeHistoryPage(historyMeta.page + 1)}
              >
                Next
                <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            </div>
          </div>
        ) : null}
      </Card>

      {/* =====================================================
          CREATE / EDIT / STOCK ACTION DIALOG
          ===================================================== */}

      <Dialog
        open={open}
        onOpenChange={setOpen}
        title={
          mode === "create"
            ? "Add inventory item"
            : mode === "edit"
              ? "Edit inventory item"
              : mode === "in"
                ? "Stock in"
                : mode === "out"
                  ? "Stock out"
                  : "Adjust quantity"
        }
        description={
          mode === "in"
            ? "Add stock to the current quantity and create a permanent transaction record."
            : mode === "out"
              ? "Deduct stock from the current quantity and create a permanent transaction record."
              : mode === "adjust"
                ? "Set the exact physical quantity. The difference will be preserved as an adjustment."
                : "Maintain inventory master data without directly changing stock quantity."
        }
      >
        {/* ===================================================
            CREATE / EDIT
            =================================================== */}

        {mode === "create" || mode === "edit" ? (
          <form
            onSubmit={form.handleSubmit(submit)}
            className="grid gap-5 sm:grid-cols-2"
          >
            <div>
              <Label required>Name</Label>

              <Input
                {...form.register("name")}
                placeholder="e.g. Coppens Feed 4mm"
              />
            </div>

            <div>
              <Label required>Category</Label>

              <Select {...form.register("category")}>
                {INVENTORY_CATEGORIES.map((category) => (
                  <option key={category} value={category}>
                    {labelize(category)}
                  </option>
                ))}
              </Select>
            </div>

            <div>
              <Label>Unit</Label>

              <Input
                {...form.register("unit")}
                placeholder="kg, litre, bottle, piece..."
              />
            </div>

            <div>
              <Label>Reorder level</Label>

              <Input
                type="number"
                step="0.01"
                min="0"
                {...form.register("reorderLevel")}
              />

              <p className="mt-1 text-xs text-[var(--muted)]">
                Stock at or below this quantity is considered low.
              </p>
            </div>

            <div>
              <Label>Unit cost</Label>

              <Input
                type="number"
                step="0.01"
                min="0"
                {...form.register("unitCost")}
              />
            </div>

            <div>
              <Label>Supplier</Label>

              <Input {...form.register("supplier")} />
            </div>

            <div>
              <Label>Storage location</Label>

              <Input
                {...form.register("storageLocation")}
                placeholder="e.g. Feed Store"
              />
            </div>

            {mode === "create" && (
              <div>
                <Label>Opening quantity</Label>

                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  {...form.register("quantity")}
                />

                <p className="mt-1 text-xs text-[var(--muted)]">
                  An opening quantity greater than zero automatically creates an
                  initial stock-in transaction.
                </p>
              </div>
            )}

            <div className="sm:col-span-2">
              <Label>Description</Label>

              <textarea
                {...form.register("description")}
                className="min-h-20 w-full rounded-xl border bg-transparent p-3 text-sm outline-none"
                placeholder="Describe this inventory item..."
              />
            </div>

            <div className="sm:col-span-2">
              <Label>Notes</Label>

              <textarea
                {...form.register("notes")}
                className="min-h-20 w-full rounded-xl border bg-transparent p-3 text-sm outline-none"
              />
            </div>

            <div className="flex justify-end gap-2 sm:col-span-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
              >
                Cancel
              </Button>

              <Button type="submit">
                {mode === "create" ? "Create item" : "Save changes"}
              </Button>
            </div>
          </form>
        ) : (
          /* =================================================
             STOCK ACTION
             ================================================= */

          <form
            onSubmit={actionForm.handleSubmit(submitAction)}
            className="grid gap-5"
          >
            <div className="rounded-2xl border bg-slate-50 p-4 dark:bg-slate-900">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="font-black">{item?.name}</div>

                  <div className="mt-1 text-xs text-[var(--muted)]">
                    Current quantity: {formatNumber(item?.quantity, 2)}{" "}
                    {item?.unit}
                  </div>

                  <div className="mt-1 text-xs text-[var(--muted)]">
                    Current unit cost: {formatCurrency(item?.unitCost || 0)}
                  </div>
                </div>

                <div
                  className={`rounded-full px-2.5 py-1 text-xs font-bold ${statusClass(
                    getStatus(item),
                  )}`}
                >
                  {statusLabel(getStatus(item))}
                </div>
              </div>
            </div>

            <div>
              <Label required>
                {mode === "adjust" ? "New quantity" : "Quantity"}
              </Label>

              <Input
                type="number"
                step="0.01"
                min="0"
                {...actionForm.register("quantity")}
              />

              {mode === "adjust" && (
                <p className="mt-1 text-xs text-[var(--muted)]">
                  Enter the actual physical quantity currently available. The
                  backend will automatically record the difference as an
                  adjustment.
                </p>
              )}
            </div>

            {mode !== "adjust" && (
              <>
                {mode === "in" && (
                  <div>
                    <Label>Unit cost</Label>

                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      {...actionForm.register("unitCost")}
                    />

                    <p className="mt-1 text-xs text-[var(--muted)]">
                      Leave blank to use the current inventory unit cost.
                    </p>
                  </div>
                )}

                <div>
                  <Label>Reference type</Label>

                  <Select {...actionForm.register("referenceType")}>
                    {INVENTORY_REFERENCE_TYPES.map((reference) => (
                      <option key={reference} value={reference}>
                        {labelize(reference)}
                      </option>
                    ))}
                  </Select>
                </div>

                {actionForm.watch("referenceType") !== "manual" && (
                  <div>
                    <Label>Reference ID</Label>

                    <Input
                      {...actionForm.register("referenceId")}
                      placeholder="Optional related MongoDB ID"
                    />

                    <p className="mt-1 text-xs text-[var(--muted)]">
                      Use this when the movement originates from another farm
                      record.
                    </p>
                  </div>
                )}
              </>
            )}

            <div>
              <Label>Notes</Label>

              <textarea
                {...actionForm.register("notes")}
                className="min-h-24 w-full rounded-xl border bg-transparent p-3 text-sm outline-none"
                placeholder="Explain why this movement occurred..."
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
              >
                Cancel
              </Button>

              <Button type="submit">Confirm movement</Button>
            </div>
          </form>
        )}
      </Dialog>

      {/* =====================================================
          FULL HISTORY DIALOG
          ===================================================== */}

      <Dialog
        open={historyOpen}
        onOpenChange={setHistoryOpen}
        title="Complete inventory transaction history"
        description="Every recorded inventory movement across the farm."
      >
        <div className="space-y-5">
          {/* FILTERS */}

          <div className="grid gap-3 md:grid-cols-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]" />

              <Input
                value={historyFilters.search}
                onChange={(event) =>
                  setHistoryFilters((current) => ({
                    ...current,
                    search: event.target.value,
                    page: 1,
                  }))
                }
                placeholder="Search item, supplier, category, reference or notes..."
                className="pl-10"
              />
            </div>

            <Select
              value={historyFilters.transactionType}
              onChange={(event) =>
                setHistoryFilters((current) => ({
                  ...current,
                  transactionType: event.target.value,
                  page: 1,
                }))
              }
            >
              <option value="">All transaction types</option>

              {TRANSACTION_TYPES.map((type) => (
                <option key={type} value={type}>
                  {transactionLabel(type)}
                </option>
              ))}
            </Select>

            <Select
              value={historyFilters.referenceType}
              onChange={(event) =>
                setHistoryFilters((current) => ({
                  ...current,
                  referenceType: event.target.value,
                  page: 1,
                }))
              }
            >
              <option value="">All reference types</option>

              {INVENTORY_REFERENCE_TYPES.map((reference) => (
                <option key={reference} value={reference}>
                  {labelize(reference)}
                </option>
              ))}
            </Select>

            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={resetHistoryFilters}
              >
                <X className="mr-2 h-4 w-4" />
                Reset
              </Button>

              <Button className="flex-1" onClick={applyHistoryFilters}>
                <Search className="mr-2 h-4 w-4" />
                Apply
              </Button>
            </div>
          </div>

          {/* DATE FILTERS */}

          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <Label>From</Label>

              <Input
                type="date"
                value={historyFilters.startDate}
                onChange={(event) =>
                  setHistoryFilters((current) => ({
                    ...current,
                    startDate: event.target.value,
                    page: 1,
                  }))
                }
              />
            </div>

            <div>
              <Label>To</Label>

              <Input
                type="date"
                value={historyFilters.endDate}
                onChange={(event) =>
                  setHistoryFilters((current) => ({
                    ...current,
                    endDate: event.target.value,
                    page: 1,
                  }))
                }
              />
            </div>
          </div>

          {/* TABLE */}

          <div className="overflow-x-auto rounded-2xl border">
            {historyLoading ? (
              <div className="py-14 text-center text-sm text-[var(--muted)]">
                Loading transaction history...
              </div>
            ) : history.length ? (
              <Table>
                <THead>
                  <TR>
                    <TH>Date</TH>

                    <TH>Item</TH>

                    <TH>Type</TH>

                    <TH>Quantity</TH>

                    <TH>Before</TH>

                    <TH>After</TH>

                    <TH>Unit Cost</TH>

                    <TH>Value</TH>

                    <TH>Reference</TH>

                    <TH>Notes</TH>
                  </TR>
                </THead>

                <TBody>
                  {history.map((transaction) => (
                    <TR key={transaction._id}>
                      <TD className="whitespace-nowrap">
                        {formatDateTime(transaction.transactionDate)}
                      </TD>

                      <TD>
                        <div className="font-bold">
                          {transaction.inventoryItemName}
                        </div>

                        <div className="text-xs text-[var(--muted)]">
                          {transaction.inventoryCategory
                            ? labelize(transaction.inventoryCategory)
                            : "Inventory"}
                        </div>
                      </TD>

                      <TD>
                        <div className="flex min-w-[150px] items-center gap-2">
                          <span
                            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                              transaction.transactionType === "stock_in"
                                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
                                : transaction.transactionType === "stock_out"
                                  ? "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300"
                                  : transaction.transactionType === "damaged" ||
                                      transaction.transactionType === "expired"
                                    ? "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300"
                                    : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                            }`}
                          >
                            <TransactionIcon
                              type={transaction.transactionType}
                            />
                          </span>

                          <div>
                            <StatusBadge
                              variant={transactionBadgeVariant(
                                transaction.transactionType,
                              )}
                            >
                              {transaction.transactionLabel}
                            </StatusBadge>

                            <div className="mt-1 text-xs text-[var(--muted)]">
                              {transaction.transactionDescription}
                            </div>
                          </div>
                        </div>
                      </TD>

                      <TD>
                        <span
                          className={
                            transaction.direction === "in"
                              ? "whitespace-nowrap font-black text-emerald-600"
                              : transaction.direction === "out"
                                ? "whitespace-nowrap font-black text-red-600"
                                : "whitespace-nowrap font-black"
                          }
                        >
                          {transaction.direction === "in"
                            ? "+"
                            : transaction.direction === "out"
                              ? "-"
                              : ""}
                          {formatNumber(transaction.quantity, 2)}{" "}
                          {transaction.unit}
                        </span>
                      </TD>

                      <TD>
                        {formatNumber(transaction.previousQuantity, 2)}{" "}
                        {transaction.unit}
                      </TD>

                      <TD>
                        <span className="font-bold">
                          {formatNumber(transaction.newQuantity, 2)}{" "}
                          {transaction.unit}
                        </span>
                      </TD>

                      <TD>{formatCurrency(transaction.unitCost)}</TD>

                      <TD>
                        <div className="font-black">
                          {formatCurrency(transaction.value)}
                        </div>

                        <div className="mt-1 text-xs text-[var(--muted)]">
                          {formatNumber(transaction.quantity, 2)} ×{" "}
                          {formatCurrency(transaction.unitCost)}
                        </div>
                      </TD>

                      <TD>
                        <div className="font-semibold">
                          {labelize(transaction.referenceType || "manual")}
                        </div>

                        {transaction.referenceId ? (
                          <div className="mt-1 max-w-[160px] truncate font-mono text-[10px] text-[var(--muted)]">
                            {transaction.referenceId}
                          </div>
                        ) : null}
                      </TD>

                      <TD>
                        <div className="max-w-[220px] text-xs text-[var(--muted)]">
                          {transaction.notes || "No notes"}
                        </div>
                      </TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
            ) : (
              <div className="py-14 text-center">
                <History className="mx-auto h-10 w-10 text-[var(--muted)]" />

                <h3 className="mt-3 font-bold">No transactions found</h3>

                <p className="mx-auto mt-1 max-w-md text-sm text-[var(--muted)]">
                  No inventory movements match the current filters.
                </p>
              </div>
            )}
          </div>

          {/* PAGINATION */}

          {historyMeta.pages > 1 && (
            <div className="flex items-center justify-between">
              <div className="text-sm text-[var(--muted)]">
                Page {historyMeta.page} of {historyMeta.pages}
              </div>

              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={historyMeta.page <= 1}
                  onClick={() => changeHistoryPage(historyMeta.page - 1)}
                >
                  <ChevronLeft className="mr-1 h-4 w-4" />
                  Previous
                </Button>

                <Button
                  size="sm"
                  variant="outline"
                  disabled={historyMeta.page >= historyMeta.pages}
                  onClick={() => changeHistoryPage(historyMeta.page + 1)}
                >
                  Next
                  <ChevronRight className="ml-1 h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </Dialog>

      {/* =====================================================
          ITEM HISTORY DIALOG
          ===================================================== */}

      <Dialog
        open={itemHistoryOpen}
        onOpenChange={setItemHistoryOpen}
        title={
          historyItem
            ? `${historyItem.name} — Transaction History`
            : "Transaction History"
        }
        description="Complete movement history for this inventory item."
      >
        <div className="space-y-5">
          {/* ITEM SUMMARY */}

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-2xl border p-3">
              <div className="text-xs text-[var(--muted)]">Current stock</div>

              <div className="mt-1 font-black">
                {formatNumber(historyItem?.quantity, 2)} {historyItem?.unit}
              </div>
            </div>

            <div className="rounded-2xl border p-3">
              <div className="text-xs text-[var(--muted)]">Reorder level</div>

              <div className="mt-1 font-black">
                {formatNumber(historyItem?.reorderLevel, 2)} {historyItem?.unit}
              </div>
            </div>

            <div className="rounded-2xl border p-3">
              <div className="text-xs text-[var(--muted)]">Unit cost</div>

              <div className="mt-1 font-black">
                {formatCurrency(historyItem?.unitCost || 0)}
              </div>
            </div>

            <div className="rounded-2xl border p-3">
              <div className="text-xs text-[var(--muted)]">Transactions</div>

              <div className="mt-1 font-black">
                {formatNumber(historyMeta.total || history.length)}
              </div>
            </div>
          </div>

          {/* ITEM HISTORY TABLE */}

          <div className="overflow-x-auto rounded-2xl border">
            {historyLoading ? (
              <div className="py-14 text-center text-sm text-[var(--muted)]">
                Loading history...
              </div>
            ) : history.length ? (
              <Table>
                <THead>
                  <TR>
                    <TH>Date</TH>

                    <TH>Transaction</TH>

                    <TH>Quantity</TH>

                    <TH>Before</TH>

                    <TH>After</TH>

                    <TH>Unit Cost</TH>

                    <TH>Value</TH>

                    <TH>Reference</TH>

                    <TH>Notes</TH>
                  </TR>
                </THead>

                <TBody>
                  {history.map((transaction) => (
                    <TR key={transaction._id}>
                      <TD className="whitespace-nowrap">
                        {formatDateTime(transaction.transactionDate)}
                      </TD>

                      <TD>
                        <div className="flex items-center gap-2">
                          <span
                            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                              transaction.transactionType === "stock_in"
                                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
                                : transaction.transactionType === "stock_out"
                                  ? "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300"
                                  : transaction.transactionType === "damaged" ||
                                      transaction.transactionType === "expired"
                                    ? "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300"
                                    : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                            }`}
                          >
                            <TransactionIcon
                              type={transaction.transactionType}
                            />
                          </span>

                          <div>
                            <StatusBadge
                              variant={transactionBadgeVariant(
                                transaction.transactionType,
                              )}
                            >
                              {transaction.transactionLabel}
                            </StatusBadge>

                            <div className="mt-1 text-xs text-[var(--muted)]">
                              {transaction.transactionDescription}
                            </div>
                          </div>
                        </div>
                      </TD>

                      <TD>
                        <span
                          className={
                            transaction.direction === "in"
                              ? "font-black text-emerald-600"
                              : transaction.direction === "out"
                                ? "font-black text-red-600"
                                : "font-black"
                          }
                        >
                          {transaction.direction === "in"
                            ? "+"
                            : transaction.direction === "out"
                              ? "-"
                              : ""}
                          {formatNumber(transaction.quantity, 2)}{" "}
                          {historyItem?.unit}
                        </span>
                      </TD>

                      <TD>
                        {formatNumber(transaction.previousQuantity, 2)}{" "}
                        {historyItem?.unit}
                      </TD>

                      <TD>
                        <span className="font-bold">
                          {formatNumber(transaction.newQuantity, 2)}{" "}
                          {historyItem?.unit}
                        </span>
                      </TD>

                      <TD>{formatCurrency(transaction.unitCost)}</TD>

                      <TD>
                        <div className="font-black">
                          {formatCurrency(transaction.value)}
                        </div>

                        <div className="mt-1 text-xs text-[var(--muted)]">
                          {formatNumber(transaction.quantity, 2)} ×{" "}
                          {formatCurrency(transaction.unitCost)}
                        </div>
                      </TD>

                      <TD>
                        {labelize(transaction.referenceType || "manual")}

                        {transaction.referenceId ? (
                          <div className="mt-1 max-w-[150px] truncate font-mono text-[10px] text-[var(--muted)]">
                            {transaction.referenceId}
                          </div>
                        ) : null}
                      </TD>

                      <TD>
                        <span className="text-xs text-[var(--muted)]">
                          {transaction.notes || "No notes"}
                        </span>
                      </TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
            ) : (
              <div className="py-14 text-center">
                <History className="mx-auto h-10 w-10 text-[var(--muted)]" />

                <h3 className="mt-3 font-bold">No transactions recorded</h3>

                <p className="mt-1 text-sm text-[var(--muted)]">
                  No stock movement has been recorded for this inventory item.
                </p>
              </div>
            )}
          </div>
        </div>
      </Dialog>
    </AdminLayout>
  );
}
