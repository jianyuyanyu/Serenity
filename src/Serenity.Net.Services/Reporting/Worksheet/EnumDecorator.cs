﻿namespace Serenity.Reporting
{
    using System;

    public class EnumDecorator : BaseCellDecorator
    {
        private Type enumType;
        private ITextLocalizer localizer;

        public EnumDecorator(Type enumType, ITextLocalizer localizer)
        {
            this.enumType = enumType;
            this.localizer = localizer;
        }

        public override void Decorate()
        {
            if (Value != null)
            {
                try
                {
                    Value = EnumMapper.FormatEnum(localizer, enumType, Value);
                }
                catch
                {
                }
            }
        }
    }
}