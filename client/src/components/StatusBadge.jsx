import React from 'react';
import { useTranslation } from 'react-i18next';

const statusColors = {
  new: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  in_progress: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300',
  waiting_parts: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
  ready: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  done: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300',
  cancelled: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-300',
  scheduled: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  completed: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
};

const priorityColors = {
  low: 'bg-gray-100 text-gray-500',
  normal: 'bg-blue-50 text-blue-600',
  high: 'bg-orange-100 text-orange-600',
  urgent: 'bg-red-100 text-red-600',
};

export function StatusBadge({ status }) {
  const { t } = useTranslation();
  return (
    <span className={`badge ${statusColors[status] || 'bg-gray-100 text-gray-600'}`}>
      {t(`orders.statuses.${status}`, status)}
    </span>
  );
}

export function PriorityBadge({ priority }) {
  const { t } = useTranslation();
  return (
    <span className={`badge ${priorityColors[priority] || 'bg-gray-100 text-gray-500'}`}>
      {t(`orders.priorities.${priority}`, priority)}
    </span>
  );
}
