import { describe, it, expect } from 'vitest';
import { can, canAccessView, ROLES, PERMISSIONS } from '../auth';

describe('Auth & Permissions', () => {
  describe('can()', () => {
    it('Operator only has CREATE_INCIDENTS permission', () => {
      expect(can(ROLES.OPERATOR, PERMISSIONS.CREATE_INCIDENTS)).toBe(true);
      expect(can(ROLES.OPERATOR, PERMISSIONS.EDIT_INCIDENTS)).toBe(false);
      expect(can(ROLES.OPERATOR, PERMISSIONS.DELETE_INCIDENTS)).toBe(false);
      expect(can(ROLES.OPERATOR, PERMISSIONS.MANAGE_USERS)).toBe(false);
    });

    it('Admin has all permissions', () => {
      expect(can(ROLES.ADMIN, PERMISSIONS.CREATE_INCIDENTS)).toBe(true);
      expect(can(ROLES.ADMIN, PERMISSIONS.EDIT_INCIDENTS)).toBe(true);
      expect(can(ROLES.ADMIN, PERMISSIONS.DELETE_INCIDENTS)).toBe(true);
      expect(can(ROLES.ADMIN, PERMISSIONS.MANAGE_USERS)).toBe(true);
    });

    it('Defaults to Operator if role is undefined', () => {
      expect(can(undefined, PERMISSIONS.CREATE_INCIDENTS)).toBe(true);
      expect(can(undefined, PERMISSIONS.EDIT_INCIDENTS)).toBe(false);
    });
  });

  describe('canAccessView()', () => {
    it('Operator can only access "nuevo"', () => {
      expect(canAccessView(ROLES.OPERATOR, 'nuevo')).toBe(true);
      expect(canAccessView(ROLES.OPERATOR, 'dashboard')).toBe(false);
      expect(canAccessView(ROLES.OPERATOR, 'usuarios')).toBe(false);
    });

    it('Admin can access any view', () => {
      expect(canAccessView(ROLES.ADMIN, 'nuevo')).toBe(true);
      expect(canAccessView(ROLES.ADMIN, 'dashboard')).toBe(true);
      expect(canAccessView(ROLES.ADMIN, 'usuarios')).toBe(true);
      expect(canAccessView(ROLES.ADMIN, 'configuracion')).toBe(true);
    });
  });
});
